-- View para retornar usuarios inscritos na newsletter
-- Inclui usuarios que:
-- 1) Nao tem registro em newsletter_preferences (nunca se desinscreveram)
-- 2) OU tem registro mas com subscribed = true (reinscrito)

CREATE OR REPLACE VIEW subscribed_users_view AS
SELECT 
  p.user_id,
  p.email,
  p.full_name,
  COALESCE(np.subscribed, true) as subscribed,
  np.unsubscribed_at,
  np.created_at as preference_created_at
FROM 
  profiles p
LEFT JOIN 
  newsletter_preferences np ON p.user_id = np.user_id
WHERE 
  -- Usuario nunca se desinscreveu OU esta reinscrito
  (np.subscribed IS NULL OR np.subscribed = true)
  -- Garantir que tem email valido
  AND p.email IS NOT NULL
  AND p.email != '';

-- Comentario da view
COMMENT ON VIEW subscribed_users_view IS 'Retorna todos os usuarios inscritos na newsletter (sem desinscrição ou reinscritos)';
