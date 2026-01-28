import { supabaseAdmin } from "../config/database";
import {
  MessageTemplate,
  MessageKey,
  UserStats,
} from "../types/whatsapp.types";
import { EmailService } from "../services/email.service";
import { encryptUserIdWithIV } from "../utils/crypto.utils";

// Message templates - source of truth
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    key: "welcome_10min",
    delayMinutes: 10,
    body: `Oi! Aqui é o Thiago, do Fingestor 👋

Muita gente chega no Fingestor porque sente que o dinheiro entra, sai… e no fim do mês não fica claro pra onde foi.

Se você baixou buscando mais controle, você está no lugar certo.
E se ainda estiver com alguma dúvida agora no começo, pode me chamar por aqui.`,
    condition: (stats) => {
      // Sempre envia, exceto se o usuário já completou tudo
      return !(stats.accountCount > 0 && stats.transactionCount > 0);
    },
  },
  {
    key: "create_account_24h",
    delayMinutes: 24 * 60,
    body: `Queria confirmar uma coisa com você.

Você baixou o Fingestor pra organizar finanças pessoais, da empresa, ou os dois?
Pergunto porque, sem criar uma conta, o sistema não consegue te mostrar nada ainda.

Se tiver ficado alguma dúvida nessa parte, me avisa.`,
    condition: (stats) => {
      // Só envia se não tem conta E não completou tudo
      return stats.accountCount === 0 && stats.transactionCount === 0;
    },
  },
  {
    key: "first_tx_48h",
    delayMinutes: 48 * 60,
    body: `Muita gente para exatamente nesse ponto.

A conta já foi criada, mas ainda não lançou nada porque fica aquela dúvida:
“O que eu lanço primeiro?”
“E se eu errar?”

Pode ficar tranquilo: nada aqui é definitivo.
Você pode lançar qualquer valor de teste só pra entender como funciona.`,
    condition: (stats) =>
      stats.accountCount > 0 && stats.transactionCount === 0,
  },
  {
    key: "micro_win_72h",
    delayMinutes: 72 * 60,
    body: `Sem registrar entradas e gastos, o Fingestor não consegue te ajudar.

Mas basta um passo simples pra virar a chave:
👉 uma entrada OU uma despesa já é suficiente.

A partir disso você começa a enxergar saldo, histórico e organização real.`,
    condition: (stats) =>
      stats.accountCount > 0 && stats.transactionCount === 0,
  },
  {
    key: "value_5d",
    delayMinutes: 5 * 24 * 60,
    body: `O problema de não anotar nada é que a gente acaba decidindo no “achismo”.

A maioria das pessoas só descobre onde o dinheiro realmente está indo
quando começa a registrar as transações.

É exatamente isso que o Fingestor resolve.`,
    condition: (stats) => stats.transactionCount === 0,
  },
  {
    key: "help_7d",
    delayMinutes: 7 * 24 * 60,
    body: `Se até agora você não usou muito o Fingestor,
pode ser só uma dúvida de começo — e isso é normal.

Me conta aqui:
você quer usar mais pra controle pessoal ou pra empresa?
Eu te explico o caminho ideal no seu caso.`,
    condition: (stats) => {
      // Só envia se ainda não tem transação
      return stats.transactionCount === 0;
    },
  },
  {
    key: "comeback_inactive",
    delayMinutes: 30 * 24 * 60, // 30 dias
    body: `Faz um tempo que você não lança nada no Fingestor…

Eu sei que a rotina aperta e às vezes a gente acaba deixando o controle de lado.
Mas é justamente nos períodos mais corridos que perder a visão das finanças pode complicar.

Se quiser retomar, estou por aqui pra te ajudar. 💪`,
    condition: (stats) => {
      // Só envia se:
      // 1. Tem pelo menos 1 transação (já usou o sistema)
      // 2. Última transação foi há mais de 30 dias
      if (stats.transactionCount === 0 || !stats.lastTransactionDate) {
        return false;
      }
      
      const lastTx = new Date(stats.lastTransactionDate);
      const now = new Date();
      const daysSinceLastTx = (now.getTime() - lastTx.getTime()) / (1000 * 60 * 60 * 24);
      
      return daysSinceLastTx >= 30;
    },
  },
];



export class WhatsAppController {
  private static emailService = new EmailService();

  /**
   * Get message body based on user current state
   */
  static getMessageBody(messageKey: MessageKey, stats: UserStats): string {
    const hasAccount = stats.accountCount > 0;
    const hasTransactions = stats.transactionCount > 0;

    switch (messageKey) {
      case "welcome_10min":
        return `Oi! Aqui é o Thiago, do Fingestor 👋

Muita gente chega no Fingestor porque sente que o dinheiro entra, sai… e no fim do mês não fica claro pra onde foi.

Se você baixou buscando mais controle, você está no lugar certo.
E se ainda estiver com alguma dúvida agora no começo, pode me chamar por aqui.`;

      case "create_account_24h":
        if (!hasAccount) {
          return `Queria confirmar uma coisa com você.

Você baixou o Fingestor pra organizar finanças pessoais, da empresa, ou os dois?
Pergunto porque, sem criar uma conta, o sistema não consegue te mostrar nada ainda.

Se tiver ficado alguma dúvida nessa parte, me avisa.`;
        } else if (!hasTransactions) {
          return `Vi que você criou a conta! Muito bom 👏

Agora o próximo passo é começar a lançar entradas e despesas.
Sem isso, o sistema ainda não consegue te dar visão real das suas finanças.

Qualquer dúvida sobre como começar, é só falar.`;
        } else {
          return `Opa, vi que você já está usando o Fingestor! 🎉

Parabéns por dar esse passo. Manter o controle financeiro atualizado é o que faz toda a diferença.

Se precisar de alguma dica ou tiver dúvida, estou aqui.`;
        }

      case "first_tx_48h":
        if (!hasAccount) {
          return `Percebi que você ainda não criou uma conta no sistema.

Sem ela, não tem como começar a organizar suas finanças.
É rápido: você cria uma conta e já pode começar a lançar.

Alguma dúvida nessa parte?`;
        } else if (!hasTransactions) {
          return `Muita gente para exatamente nesse ponto.

A conta já foi criada, mas ainda não lançou nada porque fica aquela dúvida:
"O que eu lanço primeiro?"
"E se eu errar?"

Pode ficar tranquilo: nada aqui é definitivo.
Você pode lançar qualquer valor de teste só pra entender como funciona.`;
        } else {
          return `Que legal, você já está com transações lançadas! 💪

Continua assim. Quanto mais você registra, mais claro fica pra onde o dinheiro está indo.
E qualquer coisa, pode me chamar.`;
        }

      case "micro_win_72h":
        if (!hasAccount) {
          return `O primeiro passo mesmo é criar uma conta.

Pode ser conta pessoal, conta da empresa, ou as duas.
Depois disso, você já consegue lançar e ver tudo organizado.

Precisa de ajuda pra começar?`;
        } else if (!hasTransactions) {
          return `Sem registrar entradas e gastos, o Fingestor não consegue te ajudar.

Mas basta um passo simples pra virar a chave:
👉 uma entrada OU uma despesa qualquer

Só isso já libera visão de saldo, histórico e organização automática.`;
        } else {
          return `Percebi que você já tem movimentações registradas. Ótimo! 🚀

Agora é manter o ritmo. O segredo é registrar com frequência,
aí você sempre tem a visão real de como andam as finanças.

Qualquer coisa, tô aqui!`;
        }

      case "value_5d":
        if (!hasAccount) {
          return `Sei que pode parecer mais um app pra "mexer depois"...

Mas a real é: sem começar, você continua no escuro sobre pra onde o dinheiro vai.
O primeiro passo é só criar uma conta no sistema.

Você topa tentar?`;
        } else if (!hasTransactions) {
          return `O problema de não anotar nada é que a gente acaba decidindo no "achismo".

A maioria das pessoas só descobre onde o dinheiro realmente está indo
quando começa a registrar as transações.

É exatamente isso que o Fingestor resolve.`;
        } else {
          return `Vi que você já está registrando suas movimentações. Muito bom! 💯

Esse controle que você está construindo agora é o que vai te dar clareza
pra tomar decisões melhores com o dinheiro.

Continua firme!`;
        }

      case "help_7d":
        if (!hasAccount) {
          return `Faz uma semana desde que você baixou o Fingestor.

Se ainda não criou uma conta, pode ser que tenha ficado alguma dúvida.
Você quer usar mais pra finanças pessoais ou da empresa?

Me conta que eu te ajudo a dar esse primeiro passo.`;
        } else if (!hasTransactions) {
          return `Se até agora você não usou muito o Fingestor,
pode ser só uma dúvida de começo — e isso é normal.

Me conta aqui:
você quer usar mais pra controle pessoal ou pra empresa?
Eu te explico o caminho ideal no seu caso.`;
        } else {
          return `Que bom ver você usando o Fingestor! 🎯

Se tiver qualquer dúvida ou quiser dicas de como aproveitar melhor o sistema,
é só chamar. Estou aqui pra isso.

Como está sendo a experiência até agora?`;
        }

      case "comeback_inactive":
        return `Faz um tempo que você não lança nada no Fingestor…

Eu sei que a rotina aperta e às vezes a gente acaba deixando o controle de lado.
Mas é justamente nos períodos mais corridos que perder a visão das finanças pode complicar.

Se quiser retomar, estou por aqui pra te ajudar. 💪`;

      default:
        return "";
    }
  }

  /**
   * Get user statistics for message scheduling
   */
  static async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      // Get user profile with phone, email, full_name and created_at
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("phone, email, full_name, created_at")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        return null;
      }

      // Count companies
      const { count: accountCount, error: accountError } = await supabaseAdmin
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (accountError) {
        console.error("Error counting companies:", accountError);
        return null;
      }

      // Get user's company IDs
      const { data: userCompanies, error: companiesError } = await supabaseAdmin
        .from("companies")
        .select("id")
        .eq("user_id", userId);

      if (companiesError) {
        console.error("Error fetching user companies:", companiesError);
        return null;
      }

      const companyIds = userCompanies?.map(c => c.id) || [];

      // Count transactions using company_id
      let transactionCount = 0;
      let lastTransactionDate: string | null = null;

      if (companyIds.length > 0) {
        const { count, error: txError } = await supabaseAdmin
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .in("company_id", companyIds);

        if (txError) {
          console.error("Error counting transactions:", txError);
          return null;
        }

        transactionCount = count || 0;

        // Get last transaction date
        if (transactionCount > 0) {
          const { data: lastTx, error: lastTxError } = await supabaseAdmin
            .from("transactions")
            .select("date")
            .in("company_id", companyIds)
            .order("date", { ascending: false })
            .limit(1)
            .single();

          if (!lastTxError && lastTx) {
            lastTransactionDate = lastTx.date;
          }
        }
      }

      // Get already sent messages
      const { data: messages, error: msgError } = await supabaseAdmin
        .from("whatsapp_message_queue")
        .select("message_key")
        .eq("user_id", userId);

      if (msgError) {
        console.error("Error fetching messages:", msgError);
        return null;
      }

      return {
        userId,
        phone: profile.phone,
        email: profile.email,
        fullName: profile.full_name,
        createdAt: profile.created_at,
        accountCount: accountCount || 0,
        transactionCount: transactionCount || 0,
        lastTransactionDate,
        sentMessages: messages?.map((m) => m.message_key as MessageKey) || [],
      };
    } catch (error) {
      console.error("Error getting user stats:", error);
      return null;
    }
  }

  /**
   * Schedule a message for a user (WhatsApp + Email)
   */
  static async scheduleMessage(
    userId: string,
    phone: string,
    template: MessageTemplate,
    scheduledFor: Date,
    email?: string,
    userName?: string,
  ): Promise<boolean> {
    try {
      // 1. Agendar WhatsApp
      const { error } = await supabaseAdmin.from("whatsapp_message_queue").insert({
        user_id: userId,
        phone,
        message_key: template.key,
        message_body: template.body,
        scheduled_for: scheduledFor.toISOString(),
        status: "pending",
      });

      if (error) {
        // Ignore unique constraint violations (message already scheduled)
        if (error.code === "23505") {
          console.log(
            `Message ${template.key} already scheduled for user ${userId}`,
          );
          return false;
        }
        console.error("Error scheduling message:", error);
        return false;
      }

      console.log(
        `Scheduled ${template.key} for user ${userId} at ${scheduledFor.toISOString()}`,
      );

      // 2. Enviar email imediatamente (não agendar)
      if (email && userName) {
        try {
          const unsubscribeToken = encryptUserIdWithIV(userId);
          const emailResult = await this.emailService.sendEngagementAlert(
            email,
            userName,
            template.key,
            template.body,
            unsubscribeToken
          );

          if (emailResult.success) {
            console.log(`✅ Email de ${template.key} enviado para ${email}`);
          } else {
            console.error(`❌ Erro ao enviar email de ${template.key}:`, emailResult.error);
          }
        } catch (emailError) {
          console.error(`❌ Erro ao processar email de ${template.key}:`, emailError);
          // Não bloquear o agendamento do WhatsApp por erro de email
        }
      }

      return true;
    } catch (error) {
      console.error("Error in scheduleMessage:", error);
      return false;
    }
  }

  /**
   * Process all users and schedule eligible messages
   */
  static async scheduleMessagesForAllUsers(): Promise<void> {
    try {
      console.log("Starting message scheduling job...");

      // Get all users with phone numbers
      const { data: profiles, error } = await supabaseAdmin
        .from("profiles")
        .select("user_id, phone, created_at")
        .not("phone", "is", null);

      if (error) {
        console.error("Error fetching profiles:", error);
        return;
      }

      if (!profiles || profiles.length === 0) {
        console.log("No users with phone numbers found");
        return;
      }

      console.log(`Processing ${profiles.length} users...`);
      let scheduledCount = 0;

      for (const profile of profiles) {
        const stats = await this.getUserStats(profile.user_id);

        if (!stats || !stats.phone) {
          continue;
        }

        const userCreatedAt = new Date(stats.createdAt);

        // Get all messages for this user (scheduled and sent)
        const { data: userMessages, error: userMsgError } = await supabaseAdmin
          .from("whatsapp_message_queue")
          .select("message_key, scheduled_for, status, created_at")
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: true });

        if (userMsgError) {
          console.error("Error fetching user messages:", userMsgError);
          continue;
        }

        const existingMessages = userMessages || [];

        // Check each template sequentially
        for (let i = 0; i < MESSAGE_TEMPLATES.length; i++) {
          const template = MESSAGE_TEMPLATES[i];
          
          // Skip comeback_inactive as it has different logic
          if (template.key === 'comeback_inactive') {
            continue;
          }

          // Check if this message already exists for the user
          const messageExists = existingMessages.some(m => m.message_key === template.key);
          
          if (messageExists) {
            // Message already scheduled/sent, continue to next
            continue;
          }

          // Check if condition is met
          if (!template.condition(stats)) {
            continue;
          }

          // For the first message (welcome_10min)
          if (i === 0) {
            const scheduledFor = new Date(userCreatedAt);
            scheduledFor.setMinutes(scheduledFor.getMinutes() + template.delayMinutes);

            const messageBody = this.getMessageBody(template.key, stats);
            const scheduled = await this.scheduleMessage(
              stats.userId,
              stats.phone,
              { ...template, body: messageBody },
              scheduledFor,
              stats.email || undefined,
              stats.fullName || undefined,
            );

            if (scheduled) {
              scheduledCount++;
            }
            
            // Stop here - only schedule first message at a time
            break;
          }

          // For subsequent messages, check if previous message exists
          const previousTemplate = MESSAGE_TEMPLATES[i - 1];
          const previousMessage = existingMessages.find(m => m.message_key === previousTemplate.key);

          if (!previousMessage) {
            // Previous message not scheduled yet, stop here
            break;
          }

          // Calculate scheduled time based on previous message's scheduled_for + current delay
          const previousScheduledDate = new Date(previousMessage.scheduled_for);
          const scheduledFor = new Date(previousScheduledDate);
          scheduledFor.setMinutes(scheduledFor.getMinutes() + template.delayMinutes);

          const messageBody = this.getMessageBody(template.key, stats);
          const scheduled = await this.scheduleMessage(
            stats.userId,
            stats.phone,
            { ...template, body: messageBody },
            scheduledFor,
            stats.email || undefined,
            stats.fullName || undefined,
          );

          if (scheduled) {
            scheduledCount++;
          }

          // Stop after scheduling one message
          break;
        }

        // Handle comeback_inactive separately
        const comebackTemplate = MESSAGE_TEMPLATES.find(t => t.key === 'comeback_inactive');
        if (comebackTemplate && comebackTemplate.condition(stats)) {
          const comebackExists = existingMessages.some(m => m.message_key === 'comeback_inactive');
          
          if (!comebackExists && stats.lastTransactionDate) {
            const scheduledFor = new Date(stats.lastTransactionDate);
            scheduledFor.setMinutes(scheduledFor.getMinutes() + comebackTemplate.delayMinutes);

            const messageBody = this.getMessageBody('comeback_inactive', stats);
            const scheduled = await this.scheduleMessage(
              stats.userId,
              stats.phone,
              { ...comebackTemplate, body: messageBody },
              scheduledFor,
              stats.email || undefined,
              stats.fullName || undefined,
            );

            if (scheduled) {
              scheduledCount++;
            }
          }
        }
      }

      console.log(
        `Message scheduling job completed. Scheduled ${scheduledCount} new messages.`,
      );
    } catch (error) {
      console.error("Error in scheduleMessagesForAllUsers:", error);
    }
  }
}
