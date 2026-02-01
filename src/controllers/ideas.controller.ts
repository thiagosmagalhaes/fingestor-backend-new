import { Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import sanitizeHtml from 'sanitize-html';

export const createIdea = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const { title, description } = req.body;
        const userId = req.user!.id;
        const supabase = getSupabaseClient(req.accessToken!);

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }

        // Sanitize HTML to prevent XSS attacks
        const sanitizedDescription = sanitizeHtml(description, {
            allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote'],
            allowedAttributes: {},
            allowedSchemes: []
        });

        const { data, error } = await supabase
            .from('ideas')
            .insert({
                user_id: userId,
                title,
                description: sanitizedDescription,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error('Error creating idea:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create idea',
            error: error.message
        });
    }
};

export const getIdeas = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user!.id;
        const { status } = req.query;
        const supabase = getSupabaseClient(req.accessToken!);

        const { data, error } = await supabase
            .rpc('get_ideas_with_votes', {
                p_user_id: userId,
                p_status_filter: status || null
            });

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error('Error fetching ideas:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ideas',
            error: error.message
        });
    }
};

export const getIdeaById = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const supabase = getSupabaseClient(req.accessToken!);

        const { data, error } = await supabase
            .rpc('get_idea_by_id', {
                p_idea_id: id,
                p_user_id: userId
            });

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        res.json({
            success: true,
            data: data[0]
        });
    } catch (error: any) {
        console.error('Error fetching idea:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch idea',
            error: error.message
        });
    }
};

export const voteIdea = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const { voteType } = req.body;
        const userId = req.user!.id;
        const supabase = getSupabaseClient(req.accessToken!);

        if (voteType !== 1 && voteType !== -1) {
            return res.status(400).json({
                success: false,
                message: 'Vote type must be 1 (upvote) or -1 (downvote)'
            });
        }

        // Check if idea exists and is votable
        const { data: idea, error: ideaError } = await supabase
            .from('ideas')
            .select('id, status')
            .eq('id', id)
            .single();

        if (ideaError || !idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        if (!['approved', 'in_progress', 'implemented'].includes(idea.status)) {
            return res.status(400).json({
                success: false,
                message: 'Can only vote on approved ideas'
            });
        }

        // Check if user already voted
        const { data: existingVote } = await supabase
            .from('idea_votes')
            .select('*')
            .eq('idea_id', id)
            .eq('user_id', userId)
            .single();

        if (existingVote) {
            // Update existing vote
            const { error: updateError } = await supabase
                .from('idea_votes')
                .update({ vote_type: voteType })
                .eq('idea_id', id)
                .eq('user_id', userId);

            if (updateError) throw updateError;

            return res.json({
                success: true,
                message: 'Vote updated successfully'
            });
        } else {
            // Create new vote
            const { error: insertError } = await supabase
                .from('idea_votes')
                .insert({
                    idea_id: id,
                    user_id: userId,
                    vote_type: voteType
                });

            if (insertError) throw insertError;

            return res.status(201).json({
                success: true,
                message: 'Vote registered successfully'
            });
        }
    } catch (error: any) {
        console.error('Error voting idea:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to vote',
            error: error.message
        });
    }
};

export const removeVote = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const supabase = getSupabaseClient(req.accessToken!);

        const { error } = await supabase
            .from('idea_votes')
            .delete()
            .eq('idea_id', id)
            .eq('user_id', userId);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Vote removed successfully'
        });
    } catch (error: any) {
        console.error('Error removing vote:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove vote',
            error: error.message
        });
    }
};

export const updateIdeaStatus = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const supabase = getSupabaseClient(req.accessToken!);

        const validStatuses = ['pending', 'approved', 'in_progress', 'implemented', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }

        const { data, error } = await supabase
            .from('ideas')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        res.json({
            success: true,
            data,
            message: 'Idea status updated successfully'
        });
    } catch (error: any) {
        console.error('Error updating idea status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update idea status',
            error: error.message
        });
    }
};

export const updateIdea = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;
        const userId = req.user!.id;
        const supabase = getSupabaseClient(req.accessToken!);

        if (!title && !description) {
            return res.status(400).json({
                success: false,
                message: 'At least one field (title or description) must be provided'
            });
        }

        // Check if user owns the idea
        const { data: idea } = await supabase
            .from('ideas')
            .select('user_id, status')
            .eq('id', id)
            .single();

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        if (idea.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own ideas'
            });
        }

        if (idea.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Can only update pending ideas'
            });
        }

        const updateData: any = {};
        if (title) updateData.title = title;
        if (description) {
            // Sanitize HTML to prevent XSS attacks
            updateData.description = sanitizeHtml(description, {
                allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote'],
                allowedAttributes: {},
                allowedSchemes: []
            });
        }

        const { data, error } = await supabase
            .from('ideas')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data,
            message: 'Idea updated successfully'
        });
    } catch (error: any) {
        console.error('Error updating idea:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update idea',
            error: error.message
        });
    }
};

export const deleteIdea = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const supabase = getSupabaseClient(req.accessToken!);

        // Check if user owns the idea
        const { data: idea } = await supabase
            .from('ideas')
            .select('user_id, status')
            .eq('id', id)
            .single();

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }

        if (idea.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own ideas'
            });
        }

        if (idea.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Can only delete pending ideas'
            });
        }

        const { error } = await supabase
            .from('ideas')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Idea deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting idea:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete idea',
            error: error.message
        });
    }
};
