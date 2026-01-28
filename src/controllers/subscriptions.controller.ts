import { Request, Response } from "express";
import Stripe from "stripe";
import { getSupabaseClient, supabaseAdmin } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { EmailService } from "../services/email.service";
import crypto from "crypto";

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

// Mapeamento de preços do Stripe
const PRICE_IDS = {
  mensal: process.env.STRIPE_PRICE_MENSAL || "",
  semestral: process.env.STRIPE_PRICE_SEMESTRAL || "",
  anual: process.env.STRIPE_PRICE_ANUAL || "",
} as const;

type PlanType = keyof typeof PRICE_IDS;

/**
 * Criar sessão de checkout do Stripe
 */
export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response,
): Promise<void | Response> => {
  try {
    const userId = req.user?.id;
    const { plan_type } = req.body;

    if (!userId || !req.accessToken) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Usuário não autenticado",
      });
    }

    // Criar cliente Supabase autenticado
    const supabase = getSupabaseClient(req.accessToken);

    // Validar tipo de plano
    if (!plan_type || !["mensal", "semestral", "anual"].includes(plan_type)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Tipo de plano inválido. Use: mensal, semestral ou anual",
      });
    }

    const priceId = PRICE_IDS[plan_type as PlanType];

    // Buscar email do usuário na tabela profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .single();

    if (profileError || !profiles || !profiles.email) {
      return res.status(404).json({
        error: "Not Found",
        message: "Usuário não encontrado",
      });
    }

    const userEmail = profiles.email;

    // Verificar se usuário já tem subscription ativa
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .single();

    if (existingSubscription) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Usuário já possui uma assinatura ativa",
      });
    }

    // Buscar ou criar customer do Stripe
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          user_id: userId,
        },
      });
      customerId = customer.id;
    }

    // Garantir que a URL tenha protocolo
    const frontendUrl = process.env.FRONTEND_URL || "";
    const baseUrl = frontendUrl.startsWith("http") ? frontendUrl : `https://${frontendUrl}`;

    // Criar sessão de checkout SEM trial (usuário já tem 15 dias grátis ao se cadastrar)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_type,
        },
      },
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription/cancel`,
      metadata: {
        user_id: userId,
        plan_type,
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error("Erro ao criar sessão de checkout:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Erro ao criar sessão de checkout",
    });
  }
};

/**
 * Webhook do Stripe para processar eventos
 */
export const handleStripeWebhook = async (
  req: Request,
  res: Response,
): Promise<void | Response> => {
  // A assinatura pode vir como string ou array, garantir que é string
  const signatureHeader = req.headers["stripe-signature"];
  const signature = Array.isArray(signatureHeader) 
    ? signatureHeader[0] 
    : signatureHeader;

  if (!signature) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Assinatura do webhook ausente",
    });
  }

  // Verificar se temos o webhook secret configurado
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET não configurado!");
    return res.status(500).json({
      error: "Configuration Error",
      message: "Webhook secret não configurado",
    });
  }

  let event: Stripe.Event;

  try {
    // req.body deve ser um Buffer quando usamos express.raw()
    if (!Buffer.isBuffer(req.body)) {
      console.error("req.body não é um Buffer! Tipo:", typeof req.body);
      return res.status(400).json({
        error: "Bad Request",
        message: "Body deve ser raw/buffer",
      });
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    
    console.log(`✅ Webhook verificado com sucesso: ${event.type}`);
  } catch (error: any) {
    console.error("Erro ao verificar webhook:", error);
    return res.status(400).json({
      error: "Webhook Error",
      message: error.message,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Erro ao processar webhook:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
};

/**
 * Obter status da assinatura do usuário
 */
export const getSubscriptionStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void | Response> => {
  try {
    const userId = req.user?.id;

    if (!userId || !req.accessToken) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Usuário não autenticado",
      });
    }

    // Criar cliente Supabase autenticado
    const supabase = getSupabaseClient(req.accessToken);

    // Buscar data de criação do usuário na tabela profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("user_id", userId)
      .limit(1);
    
    if (profileError || !profiles || profiles.length === 0) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Erro ao buscar informações do usuário",
      });
    }

    const userCreatedAt = new Date(profiles[0].created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Buscar assinatura ativa
    const { data: activeSubscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Se tem assinatura ativa, retornar ela
    if (activeSubscription && !subError) {
      return res.status(200).json({
        id: activeSubscription.id,
        plan_type: activeSubscription.plan_type,
        status: activeSubscription.status,
        current_period_start: activeSubscription.current_period_start,
        current_period_end: activeSubscription.current_period_end,
        cancel_at_period_end: activeSubscription.cancel_at_period_end,
        trial_days_remaining: 0,
        requires_subscription: false,
        warning_subscription: false,
      });
    }

    // Não tem assinatura - verificar período de trial de 15 dias
    if (daysSinceCreation < 15) {
      const trialDaysRemaining = 15 - daysSinceCreation;
      const trialEndDate = new Date(userCreatedAt);
      trialEndDate.setDate(trialEndDate.getDate() + 15);

      return res.status(200).json({
        id: null,
        plan_type: null,
        status: "trial_period",
        current_period_start: userCreatedAt.toISOString(),
        current_period_end: trialEndDate.toISOString(),
        cancel_at_period_end: false,
        trial_days_remaining: trialDaysRemaining,
        requires_subscription: false,
        warning_subscription: trialDaysRemaining <= 3,
      });
    }

    // Trial expirado
    const trialEndDate = new Date(userCreatedAt);
    trialEndDate.setDate(trialEndDate.getDate() + 15);

    return res.status(200).json({
      id: null,
      plan_type: null,
      status: "trial_expired",
      current_period_start: userCreatedAt.toISOString(),
      current_period_end: trialEndDate.toISOString(),
      cancel_at_period_end: false,
      trial_days_remaining: 0,
      requires_subscription: true,
      warning_subscription: true,
    });
  } catch (error: any) {
    console.error("Erro ao buscar assinatura:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Erro ao buscar assinatura",
    });
  }
};

/**
 * Cancelar assinatura
 */
export const cancelSubscription = async (
  req: AuthRequest,
  res: Response,
): Promise<void | Response> => {
  try {
    const userId = req.user?.id;

    if (!userId || !req.accessToken) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Usuário não autenticado",
      });
    }

    // Criar cliente Supabase autenticado
    const supabase = getSupabaseClient(req.accessToken);

    // Buscar assinatura ativa do usuário
    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({
        error: "Not Found",
        message: "Nenhuma assinatura ativa encontrada",
      });
    }

    // Cancelar no Stripe
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Atualizar no banco de dados
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("id", subscription.id);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      message: "Assinatura será cancelada no fim do período atual",
      subscription: {
        ...subscription,
        cancel_at_period_end: true,
      },
    });
  } catch (error: any) {
    console.error("Erro ao cancelar assinatura:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Erro ao cancelar assinatura",
    });
  }
};

/**
 * Reativar assinatura cancelada
 */
export const reactivateSubscription = async (
  req: AuthRequest,
  res: Response,
): Promise<void | Response> => {
  try {
    const userId = req.user?.id;

    if (!userId || !req.accessToken) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Usuário não autenticado",
      });
    }

    // Criar cliente Supabase autenticado
    const supabase = getSupabaseClient(req.accessToken);

    // Buscar assinatura do usuário
    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("cancel_at_period_end", true)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({
        error: "Not Found",
        message: "Nenhuma assinatura cancelada encontrada",
      });
    }

    // Reativar no Stripe
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Atualizar no banco de dados
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: false,
        canceled_at: null,
      })
      .eq("id", subscription.id);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      message: "Assinatura reativada com sucesso",
      subscription: {
        ...subscription,
        cancel_at_period_end: false,
      },
    });
  } catch (error: any) {
    console.error("Erro ao reativar assinatura:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Erro ao reativar assinatura",
    });
  }
};

// ===== Funções auxiliares para processar webhooks =====

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const planType = session.metadata?.plan_type;

  if (!userId || !planType) {
    console.error("Metadados ausentes no checkout session");
    return;
  }

  // Buscar subscription do Stripe
  const subscriptionId = session.subscription as string;
  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
  const subscription: any = subscriptionResponse;

  console.log("Subscription data:", {
    start_date: subscription.start_date,
    current_period_end: subscription.current_period_end,
    ended_at: subscription.ended_at,
    status: subscription.status,
  });

  // Validar que temos o start_date
  if (!subscription.start_date) {
    console.error("start_date ausente na subscription:", subscription);
    return;
  }

  // Converter start_date (timestamp Unix em segundos)
  const startDate = new Date(subscription.start_date * 1000);
  const currentPeriodStart = startDate.toISOString();

  // Calcular current_period_end baseado no plan_type se não vier do Stripe
  let endDate: Date;
  
  if (subscription.current_period_end) {
    // Se o Stripe enviou, usar esse valor
    endDate = new Date(subscription.current_period_end * 1000);
  } else {
    // Calcular baseado no tipo de plano
    endDate = new Date(startDate);
    
    switch (planType) {
      case "mensal":
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case "semestral":
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case "anual":
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    
    console.log(`current_period_end calculado baseado no plano ${planType}: ${endDate.toISOString()}`);
  }

  const currentPeriodEnd = endDate.toISOString();

  // Salvar no banco de dados
  const { error } = await supabaseAdmin.from("subscriptions").insert({
    user_id: userId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscriptionId,
    plan_type: planType,
    price_id: PRICE_IDS[planType as PlanType],
    status: subscription.status,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
  });

  if (error) {
    console.error("Erro ao salvar assinatura:", error);
    return;
  }

  // Enviar newsletter de confirmação de assinatura
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .single();

    if (profile?.email) {
      const emailService = new EmailService();
      const unsubscribeToken = crypto
        .createHash('sha256')
        .update(`${profile.email}:${process.env.JWT_SECRET || 'secret'}`)
        .digest('hex');

      const planNames: Record<string, string> = {
        mensal: 'Mensal',
        semestral: 'Semestral',
        anual: 'Anual'
      };

      await emailService.sendSubscriptionConfirmedNewsletter(
        profile.email,
        profile.full_name || 'Usuário',
        planNames[planType] || planType,
        unsubscribeToken
      );

      console.log(`✅ Newsletter de confirmação enviada para ${profile.email}`);
    }
  } catch (emailError) {
    console.error('Erro ao enviar newsletter de confirmação:', emailError);
    // Não falha o webhook se o email falhar
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Type casting para acessar propriedades
  const sub = subscription as any;

  // Buscar current_period_start e current_period_end dos items
  const firstItem = sub.items?.data?.[0];
  
  const currentPeriodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : null;
  
  const currentPeriodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: sub.status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: sub.cancel_at_period_end || false,
      canceled_at: sub.canceled_at
        ? new Date(sub.canceled_at * 1000).toISOString()
        : null,
    })
    .eq("stripe_subscription_id", sub.id);

  if (error) {
    console.error("Erro ao atualizar assinatura:", error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Erro ao cancelar assinatura:", error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Type casting para acessar propriedade subscription
  const inv = invoice as any;
  const subscriptionId =
    typeof inv.subscription === "string"
      ? inv.subscription
      : inv.subscription?.id;

  if (!subscriptionId) return;

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "past_due",
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Erro ao atualizar status da assinatura:", error);
  }
}
