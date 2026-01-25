-- Create enum for idea status
CREATE TYPE idea_status AS ENUM ('pending', 'approved', 'in_progress', 'implemented', 'rejected');

-- Create ideas table
CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status idea_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create idea_votes table
CREATE TABLE idea_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(idea_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_idea_votes_idea_id ON idea_votes(idea_id);
CREATE INDEX idx_idea_votes_user_id ON idea_votes(user_id);

-- Enable RLS
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ideas table

-- Anyone can read approved, in_progress, and implemented ideas
CREATE POLICY "Anyone can read approved ideas"
    ON ideas FOR SELECT
    USING (
        status IN ('approved', 'in_progress', 'implemented') OR
        auth.uid() = user_id OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- Authenticated users can create ideas
CREATE POLICY "Authenticated users can create ideas"
    ON ideas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending ideas, admins can update any
CREATE POLICY "Users can update their own ideas or admin can update any"
    ON ideas FOR UPDATE
    USING (
        (auth.uid() = user_id AND status = 'pending') OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- Users can delete their own pending ideas, admins can delete any
CREATE POLICY "Users can delete their own pending ideas or admin can delete any"
    ON ideas FOR DELETE
    USING (
        (auth.uid() = user_id AND status = 'pending') OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- RLS Policies for idea_votes table

-- Anyone can read votes
CREATE POLICY "Anyone can read votes"
    ON idea_votes FOR SELECT
    USING (true);

-- Authenticated users can vote (insert)
CREATE POLICY "Authenticated users can vote"
    ON idea_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update their own votes"
    ON idea_votes FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes"
    ON idea_votes FOR DELETE
    USING (auth.uid() = user_id);

-- Function to get ideas with vote counts and user vote
CREATE OR REPLACE FUNCTION get_ideas_with_votes(
    p_user_id UUID,
    p_status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    description TEXT,
    status idea_status,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    vote_count INTEGER,
    upvotes INTEGER,
    downvotes INTEGER,
    user_vote INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.user_id,
        i.title,
        i.description,
        i.status,
        i.created_at,
        i.updated_at,
        COALESCE(SUM(iv.vote_type), 0)::INTEGER as vote_count,
        COALESCE(SUM(CASE WHEN iv.vote_type = 1 THEN 1 ELSE 0 END), 0)::INTEGER as upvotes,
        COALESCE(SUM(CASE WHEN iv.vote_type = -1 THEN 1 ELSE 0 END), 0)::INTEGER as downvotes,
        COALESCE(MAX(CASE WHEN iv.user_id = p_user_id THEN iv.vote_type ELSE NULL END), 0)::INTEGER as user_vote
    FROM ideas i
    LEFT JOIN idea_votes iv ON i.id = iv.idea_id
    WHERE 
        (p_status_filter IS NULL OR i.status::TEXT = p_status_filter) AND
        (i.status IN ('approved', 'in_progress', 'implemented') OR 
         i.user_id = p_user_id OR
         (SELECT auth.jwt() ->> 'role') = 'admin')
    GROUP BY i.id
    ORDER BY vote_count DESC, i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a single idea with votes
CREATE OR REPLACE FUNCTION get_idea_by_id(
    p_idea_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    description TEXT,
    status idea_status,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    vote_count INTEGER,
    upvotes INTEGER,
    downvotes INTEGER,
    user_vote INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.user_id,
        i.title,
        i.description,
        i.status,
        i.created_at,
        i.updated_at,
        COALESCE(SUM(iv.vote_type), 0)::INTEGER as vote_count,
        COALESCE(SUM(CASE WHEN iv.vote_type = 1 THEN 1 ELSE 0 END), 0)::INTEGER as upvotes,
        COALESCE(SUM(CASE WHEN iv.vote_type = -1 THEN 1 ELSE 0 END), 0)::INTEGER as downvotes,
        COALESCE(MAX(CASE WHEN iv.user_id = p_user_id THEN iv.vote_type ELSE NULL END), 0)::INTEGER as user_vote
    FROM ideas i
    LEFT JOIN idea_votes iv ON i.id = iv.idea_id
    WHERE i.id = p_idea_id
    GROUP BY i.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update idea updated_at timestamp
CREATE OR REPLACE FUNCTION update_ideas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_ideas_updated_at
    BEFORE UPDATE ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION update_ideas_updated_at();
