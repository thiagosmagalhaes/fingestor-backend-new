import { Request, Response } from "express";
import { supabaseAdmin } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { decryptUserIdWithIV } from "../utils/crypto.utils";

export class UnsubscribeController {
  /**
   * GET /api/unsubscribe?token=...
   * Processa descadastramento de newsletter
   */
  async unsubscribe(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({
          success: false,
          message: "Token invalido ou nao fornecido",
        });
      }

      // Descriptografar token para obter user_id diretamente
      let userId: string;
      try {
        userId = decryptUserIdWithIV(token);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Token invalido ou expirado",
        });
      }

      // Buscar usuario pelo user_id
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile) {
        return res.status(404).json({
          success: false,
          message: "Usuario nao encontrado",
        });
      }

      const matchedProfile = profile;

      // Verificar se ja existe registro de preferencia
      const { data: existingPreference } = await supabaseAdmin
        .from("newsletter_preferences")
        .select("id, subscribed")
        .eq("user_id", matchedProfile.user_id)
        .single();

      if (existingPreference) {
        // Atualizar para unsubscribed
        const { error: updateError } = await supabaseAdmin
          .from("newsletter_preferences")
          .update({
            subscribed: false,
            unsubscribed_at: new Date().toISOString(),
          })
          .eq("user_id", matchedProfile.user_id);

        if (updateError) {
          console.error("Erro ao atualizar preferencias:", updateError);
          return res.status(500).json({
            success: false,
            message: "Erro ao processar descadastramento",
          });
        }
      } else {
        // Criar novo registro com unsubscribed
        const { error: insertError } = await supabaseAdmin
          .from("newsletter_preferences")
          .insert({
            user_id: matchedProfile.user_id,
            email: matchedProfile.email,
            subscribed: false,
            unsubscribed_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Erro ao criar preferencias:", insertError);
          return res.status(500).json({
            success: false,
            message: "Erro ao processar descadastramento",
          });
        }
      }

      return res.json({
        success: true,
        message:
          "Voce foi descadastrado com sucesso das newsletters do Fingestor",
        email: matchedProfile.email,
      });
    } catch (error) {
      console.error("Erro ao processar unsubscribe:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * POST /api/unsubscribe/resubscribe
   * Reinscreve usuario nas newsletters
   */
  async resubscribe(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.body;

      if (!token || typeof token !== "string") {
        return res.status(400).json({
          success: false,
          message: "Token invalido ou nao fornecido",
        });
      }

      // Descriptografar token
      let userId: string;
      try {
        userId = decryptUserIdWithIV(token);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Token invalido ou expirado",
        });
      }

      // Buscar usuario
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile) {
        return res.status(404).json({
          success: false,
          message: "Usuario nao encontrado",
        });
      }

      const matchedProfile = profile;

      // Atualizar preferencia para subscribed
      const { error: updateError } = await supabaseAdmin
        .from("newsletter_preferences")
        .upsert(
          {
            user_id: matchedProfile.user_id,
            email: matchedProfile.email,
            subscribed: true,
            unsubscribed_at: null,
          },
          {
            onConflict: "user_id",
          }
        );

      if (updateError) {
        console.error("Erro ao reinscrever:", updateError);
        return res.status(500).json({
          success: false,
          message: "Erro ao processar reinscricao",
        });
      }

      return res.json({
        success: true,
        message: "Voce foi reinscrito com sucesso nas newsletters do Fingestor",
        email: matchedProfile.email,
      });
    } catch (error) {
      console.error("Erro ao processar resubscribe:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  /**
   * GET /api/unsubscribe/status?token=...
   * Verifica status de inscricao do usuario
   */
  async checkStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({
          success: false,
          message: "Token invalido ou nao fornecido",
        });
      }

      // Descriptografar token
      let userId: string;
      try {
        userId = decryptUserIdWithIV(token);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Token invalido ou expirado",
        });
      }

      // Buscar usuario
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile) {
        return res.status(404).json({
          success: false,
          message: "Usuario nao encontrado",
        });
      }

      const matchedProfile = profile;

      // Buscar preferencia
      const { data: preference } = await supabaseAdmin
        .from("newsletter_preferences")
        .select("subscribed, unsubscribed_at")
        .eq("user_id", matchedProfile.user_id)
        .single();

      return res.json({
        success: true,
        email: matchedProfile.email,
        subscribed: preference?.subscribed ?? true,
        unsubscribed_at: preference?.unsubscribed_at,
      });
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
}
