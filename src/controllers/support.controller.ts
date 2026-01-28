import { Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { isUserAdmin } from '../middleware/adminAuth';
import sanitizeHtml from 'sanitize-html';

// Sanitize HTML configuration
const sanitizeConfig = {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote'],
    allowedAttributes: {},
    allowedSchemes: []
};

export const createTicket = async (req: AuthRequest, res: Response): Promise<Response | void> => {
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

        // Sanitize HTML
        const sanitizedDescription = sanitizeHtml(description, sanitizeConfig);

        const { data, error } = await supabase
            .from('support_tickets')
            .insert({
                user_id: userId,
                title,
                description: sanitizedDescription,
                status: 'open'
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create support ticket',
            error: error.message
        });
    }
};

export const getTickets = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user!.id;
        const { status } = req.query;
        const supabase = getSupabaseClient(req.accessToken!);

        // Check if current user is admin
        const isAdmin = await isUserAdmin(req.accessToken!, userId);

        const { data, error } = await supabase
            .rpc('get_support_tickets', {
                p_user_id: userId
            });

        if (error) throw error;

        // Filter by status if provided
        let filteredData = data;
        if (status && typeof status === 'string') {
            filteredData = data.filter((ticket: any) => ticket.status === status);
        }

        res.json({
            success: true,
            data: filteredData,
            is_admin: isAdmin
        });
    } catch (error: any) {
        console.error('Error fetching support tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch support tickets',
            error: error.message
        });
    }
};

export const getTicketById = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const supabase = getSupabaseClient(req.accessToken!);

        // Check if current user is admin
        const isAdmin = await isUserAdmin(req.accessToken!, userId);

        const { data, error } = await supabase
            .rpc('get_support_ticket_by_id', {
                p_user_id: userId,
                p_ticket_id: id
            });

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }

        const ticket = data[0];

        res.json({
            success: true,
            data: ticket,
            is_admin: isAdmin
        });
    } catch (error: any) {
        console.error('Error fetching support ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch support ticket',
            error: error.message
        });
    }
};

export const getTicketMessages = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        // Check if current user is admin
        const isAdmin = await isUserAdmin(req.accessToken!, userId);

        const supabase = getSupabaseClient(req.accessToken!);

        // Check if user has access to this ticket
        const { data: ticket } = await supabase
            .from('support_tickets')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }

        const { data: messages, error } = await supabase
            .rpc('get_support_messages', {
                p_ticket_id: id
            });

        if (error) throw error;

        res.json({
            success: true,
            data: messages,
            is_admin: isAdmin
        });
    } catch (error: any) {
        console.error('Error fetching ticket messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket messages',
            error: error.message
        });
    }
};

export const createMessage = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const userId = req.user!.id;
        const supabase = getSupabaseClient(req.accessToken!);

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        // Check if ticket exists and is not closed
        const { data: ticket } = await supabase
            .from('support_tickets')
            .select('status, user_id')
            .eq('id', id)
            .single();

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }

        if (ticket.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot add messages to closed tickets'
            });
        }

        // Check if user is admin
        const userIsAdmin = await isUserAdmin(req.accessToken!, userId);

        // Sanitize HTML
        const sanitizedMessage = sanitizeHtml(message, sanitizeConfig);

        const { data: newMessage, error } = await supabase
            .from('support_messages')
            .insert({
                ticket_id: id,
                user_id: userId,
                message: sanitizedMessage,
                is_admin: userIsAdmin
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data: newMessage
        });
    } catch (error: any) {
        console.error('Error creating message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create message',
            error: error.message
        });
    }
};

export const updateTicketStatus = async (req: AuthRequest, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user!.id;
        const supabase = getSupabaseClient(req.accessToken!);

        const validStatuses = ['open', 'in_progress', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Get ticket info
        const { data: ticket } = await supabase
            .from('support_tickets')
            .select('user_id, status')
            .eq('id', id)
            .single();

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }

        const userIsAdmin = await isUserAdmin(req.accessToken!, userId);

        // Validation rules
        if (status === 'in_progress' && !userIsAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can change status to in_progress'
            });
        }

        if (status === 'closed') {
            // User can only close their own tickets, admin can close any
            if (!userIsAdmin && ticket.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only close your own tickets'
                });
            }
        }

        const updateData: any = { status };
        if (status === 'closed') {
            updateData.closed_at = new Date().toISOString();
            updateData.closed_by = userId;
        } else {
            updateData.closed_at = null;
            updateData.closed_by = null;
        }

        const { data, error } = await supabase
            .from('support_tickets')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data,
            message: 'Ticket status updated successfully'
        });
    } catch (error: any) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ticket status',
            error: error.message
        });
    }
};
