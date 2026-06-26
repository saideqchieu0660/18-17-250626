import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function routeApiRequest<T>(
  apiCall: (apiKey: string, ...args: any[]) => Promise<T>,
  args: any[],
  retryCount: number = 0
): Promise<T> {
  if (retryCount >= 5) {
    throw new Error("HTTP 503 - Quá tải hệ thống: Vượt quá số lần thử lại tối đa.");
  }

  // Bước 1: Lazy Auto-Heal - Phục hồi các key ORANGE đã hết hạn
  await prisma.vibeApiKey.updateMany({
    where: {
      status: 'ORANGE',
      recoveryUntil: { lte: new Date() }
    },
    data: {
      status: 'GREEN',
      recoveryUntil: null
    }
  });

  // Bước 2: Lấy ra một key GREEN
  const greenKey = await prisma.vibeApiKey.findFirst({
    where: { status: 'GREEN' }
  });

  if (!greenKey) {
    throw new Error("HTTP 503 - Hệ thống đang bảo trì, vui lòng nạp thêm API Key hoặc đợi key cũ hồi phục");
  }

  try {
    // Bước 3: Thực thi gọi API với key lấy được và args
    // Fix TS2556: Casting args to any[] to allow dynamic spread parameters
    return await apiCall(greenKey.keyValue, ...(args as any[]));
  } catch (error: any) {
    // Bước 4: Xử lý lỗi
    const status = error?.response?.status || error?.status;

    if (status === 429 || status === 503) {
      // Lỗi YELLOW -> Chuyển sang ORANGE, khóa 30 giây
      await prisma.vibeApiKey.update({
        where: { id: greenKey.id },
        data: {
          status: 'ORANGE',
          recoveryUntil: new Date(Date.now() + 30000)
        }
      });
      await new Promise(res => setTimeout(res, 150));
      return routeApiRequest(apiCall, args, retryCount + 1);
    } else if (status === 401 || status === 403) {
      // Lỗi RED -> Chuyển sang RED vĩnh viễn
      await prisma.vibeApiKey.update({
        where: { id: greenKey.id },
        data: {
          status: 'RED',
          recoveryUntil: null
        }
      });
      await new Promise(res => setTimeout(res, 150));
      return routeApiRequest(apiCall, args, retryCount + 1);
    }

    // Các lỗi khác thì throw ra ngoài
    throw error;
  }
}
