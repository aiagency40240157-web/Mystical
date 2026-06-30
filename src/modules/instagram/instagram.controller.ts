import { Controller, Get, Post, Body, Headers, Query, Req, Res, HttpCode } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import { InstagramService } from './instagram.service';
import { Public } from '../../common/decorators/roles.decorator';

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const META_APP_SECRET = process.env.META_APP_SECRET;

if (!META_VERIFY_TOKEN || META_VERIFY_TOKEN === 'mystical-verify-token') {
  process.stderr.write(
    'WARNING: META_VERIFY_TOKEN is not set or uses the default value. Instagram webhook is insecure.\n',
  );
}

@Controller('instagram')
@Public()
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('webhook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = META_VERIFY_TOKEN ?? '';
    if (mode === 'subscribe' && verifyToken && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  @Post('webhook')
  @HttpCode(200)
  async receive(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() payload: Record<string, unknown>,
  ): Promise<string> {
    // Verify Meta signature when APP_SECRET is configured
    if (META_APP_SECRET) {
      if (!signature) return 'EVENT_RECEIVED';
      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
      if (rawBody) {
        const expected = 'sha256=' + createHmac('sha256', META_APP_SECRET).update(rawBody).digest('hex');
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return 'EVENT_RECEIVED';
        }
      }
    }

    try {
      const entries = (payload['entry'] as Array<Record<string, unknown>>) ?? [];
      for (const entry of entries) {
        const messaging = (entry['messaging'] as Array<Record<string, unknown>>) ?? [];
        for (const event of messaging) {
          const sender = (event['sender'] as Record<string, unknown> | undefined)?.['id'] as
            | string
            | undefined;
          const message = event['message'] as Record<string, unknown> | undefined;
          const text = message?.['text'] as string | undefined;

          if (sender && text) {
            void this.instagramService.processMessage(sender, text);
          }
        }
      }
    } catch {
      // Always return 200 or Meta will retry
    }
    return 'EVENT_RECEIVED';
  }
}
