import mongoose from "mongoose";
import CashOutModel, {
  IBankInfo,
  ICashOut,
} from "../../database/models/cashOut";
import UserModel from "../../database/models/user";
import { getMessage } from "../../shared/constants/messages";
import AppError from "../../shared/errors/AppError";

interface CreateCashOutPayload {
  amount: number;
  bankInfo: IBankInfo;
}

interface CashOutListQuery {
  page?: number;
  limit?: number;
  isCashOut?: string | boolean;
}

interface MyCashOutsQuery {
  page?: number;
  limit?: number;
}

interface PaginationResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class CashOutService {
  async createCashOutRequest(
    userId: string,
    payload: CreateCashOutPayload
  ): Promise<ICashOut> {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError(
        getMessage("CASHOUT.INVALID_USER_ID") || "userId không hợp lệ",
        400
      );
    }

    const { amount, bankInfo } = payload;

    if (typeof amount !== "number" || amount <= 0) {
      throw new AppError(
        getMessage("CASHOUT.INVALID_AMOUNT") || "Số tiền rút không hợp lệ",
        400
      );
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(
        getMessage("AUTH.USER_NOT_FOUND") || "Người dùng không tồn tại",
        404
      );
    }

    if (user.tokenBalance < amount) {
      throw new AppError(
        getMessage("CASHOUT.INSUFFICIENT_BALANCE") || "Số dư token không đủ",
        400
      );
    }

    // Deduct immediately to reserve tokens
    user.tokenBalance -= amount;
    await user.save();

    const cashOut = await CashOutModel.create({
      user: new mongoose.Types.ObjectId(userId),
      amount,
      bankInfo,
    });

    return cashOut;
  }

  async getCashOutList(
    query: CashOutListQuery = {}
  ): Promise<PaginationResponse<ICashOut>> {
    const { page = 1, limit = 20, isCashOut } = query;
    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.max(Number(limit) || 20, 1);
    const skip = (currentPage - 1) * perPage;

    const filter: any = {};
    if (typeof isCashOut !== "undefined") {
      filter.isCashOut = isCashOut === "true" || isCashOut === true;
    }

    const [items, total] = await Promise.all([
      CashOutModel.find(filter)
        .populate("user", "firstName lastName email phoneNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
      CashOutModel.countDocuments(filter),
    ]);

    return {
      items: items as ICashOut[],
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getMyCashOuts(
    userId: string,
    query: MyCashOutsQuery = {}
  ): Promise<PaginationResponse<ICashOut>> {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError(
        getMessage("CASHOUT.INVALID_USER_ID") || "userId không hợp lệ",
        400
      );
    }

    const { page = 1, limit = 10 } = query;
    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.max(Number(limit) || 10, 1);
    const skip = (currentPage - 1) * perPage;

    const [items, total] = await Promise.all([
      CashOutModel.find({ user: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
      CashOutModel.countDocuments({
        user: new mongoose.Types.ObjectId(userId),
      }),
    ]);

    return {
      items: items as ICashOut[],
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async markCashOutPaid(
    cashOutId: string,
    adminId?: string
  ): Promise<ICashOut> {
    if (!cashOutId || !mongoose.Types.ObjectId.isValid(cashOutId)) {
      throw new AppError(
        getMessage("CASHOUT.INVALID_ID") || "cashOutId không hợp lệ",
        400
      );
    }

    const cashOut = await CashOutModel.findById(cashOutId);
    if (!cashOut) {
      throw new AppError(
        getMessage("CASHOUT.NOT_FOUND") || "Yêu cầu rút tiền không tồn tại",
        404
      );
    }

    if (cashOut.isCashOut) {
      throw new AppError(
        getMessage("CASHOUT.ALREADY_PROCESSED") ||
          "Yêu cầu đã được xử lý trước đó",
        400
      );
    }

    cashOut.isCashOut = true;
    cashOut.processedAt = new Date();

    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      cashOut.processedBy = new mongoose.Types.ObjectId(adminId);
    }

    await cashOut.save();

    return cashOut;
  }
}

export default new CashOutService();
