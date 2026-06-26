import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const keys = await prisma.vibeApiKey.findMany();
    
    // Mã hóa bớt ký tự đầu của keyValue để bảo mật
    const secureKeys = keys.map(k => ({
      ...k,
      keyValue: `***${k.keyValue.slice(-4)}`,
      recoveryUntil: k.recoveryUntil ? k.recoveryUntil.toISOString() : null
    }));

    res.status(200).json(secureKeys);
  } catch (error) {
    console.error("Lỗi lấy danh sách API Key:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
