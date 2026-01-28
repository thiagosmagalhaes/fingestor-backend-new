import { WhatsAppController } from '../controllers/whatsapp.controller';


/**
 * Job to schedule new WhatsApp messages for users
 * Runs every hour
 */
export function startWhatsAppSchedulingJob() {
  console.log('[WhatsApp Scheduling] Starting job...');

  // Run immediately on startup
  WhatsAppController.scheduleMessagesForAllUsers().catch(error => {
    console.error('[WhatsApp Scheduling] Initial run error:', error);
  });

  // Run every hour (3600000 ms)
  setInterval(async () => {
    console.log('[WhatsApp Scheduling] Running...');
    try {
      await WhatsAppController.scheduleMessagesForAllUsers();
    } catch (error) {
      console.error('[WhatsApp Scheduling] Error:', error);
    }
  }, 3600000);

  console.log('✅ WhatsApp message scheduling job scheduled (every hour)');
}

/**
 * Initialize both WhatsApp jobs
 */
export function startWhatsAppJobs() {
  startWhatsAppSchedulingJob();
}
