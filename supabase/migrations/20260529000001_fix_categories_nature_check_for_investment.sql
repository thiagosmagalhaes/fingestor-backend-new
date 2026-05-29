-- Fix categories_nature_check constraint to allow 'investment' type
-- The original constraint only permitted 'income' and 'expense' types.
-- With the addition of 'investment', the constraint must also allow
-- investment categories to have nature = NULL.

ALTER TABLE public.categories
DROP CONSTRAINT categories_nature_check;

ALTER TABLE public.categories
ADD CONSTRAINT categories_nature_check CHECK (
    (
        type = 'expense'
        AND nature IS NOT NULL
    )
    OR (
        type = 'income'
        AND nature IS NULL
    )
    OR (
        type = 'investment'
        AND nature IS NULL
    )
);

COMMENT ON CONSTRAINT categories_nature_check ON public.categories IS 'Nature is required for expense categories and must be NULL for income and investment categories.';