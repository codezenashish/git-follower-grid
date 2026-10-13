import { NextRequest } from 'next/server';
import { GET as handler } from '../followers.svg/route';

export async function GET(request: NextRequest) {
  return handler(request);
}
