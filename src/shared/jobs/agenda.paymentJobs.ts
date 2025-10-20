import Agenda from 'agenda';
import OrderModel from '../../database/models/order.model';

const mongoUri = process.env.MONGODB_URI;
const paymentExpired = Number(process.env.PAYOS_EXPIRED_SECONDS || "600");

let agendaInstance: any = null;

export const createAgenda = async (mongoConnectionString?: string) => {
  const uri = mongoConnectionString || mongoUri;
  if (!uri) {
    console.warn('⚠️ MONGODB_URI not set - skipping Agenda initialization');
    return null;
  }

  if (agendaInstance) return agendaInstance;

  agendaInstance = new Agenda({ db: { address: uri, collection: 'agendaJobs' } });

  // Define job: expire a specific order if still pending and unpaid
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agendaInstance.define('check-payment-expiration', async (job: any) => {
    try {
      const orderId = job?.attrs?.data?.orderId;
      if (!orderId) return;

      const order = await OrderModel.findById(orderId).lean();

      if (
        order &&
        order?.paymentInfo.status === "PENDING" &&
        !order?.isPaid
      ) {
        if (Math.floor(Date.now() / 1000) > (order?.paymentInfo?.expiredAt || 0)) {
            await OrderModel.updateOne(
            { _id: orderId },
            { $set: { "paymentInfo.status": "EXPIRED" } }
            );
            console.log(`💤 Order ${orderId} expired by agenda job`);
      }
    }
    } catch (err) {
      console.warn('check-payment-expiration job error', err);
    }
  });

  await agendaInstance.start();

  return agendaInstance;
};

export const getAgenda = () => agendaInstance;

export const scheduleExpiration = async (
  orderId: string,
  delaySeconds = paymentExpired
) => {
  if (!agendaInstance) {
    console.warn(
      "Agenda not initialized yet, cannot schedule expiration for",
      orderId
    );
    return;
  }

  const when = new Date(Date.now() + Math.max(1000, delaySeconds * 1000));
  try {
    await agendaInstance.schedule(when, "check-payment-expiration", {
      orderId,
    });
    console.log(
      `Scheduled check-payment-expiration for order ${orderId} at ${when.toISOString()}`
    );
  } catch (err) {
    console.warn("Failed to schedule expiration job for order", orderId, err);
  }
};
