import { Body, Controller, Get, Headers, Param, Post, Query, Req, Res } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { Roles, Public } from '../../common/decorators/roles.decorator';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  @Roles('ASSISTANT', 'MANAGER')
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentService.createIntent(dto.appointmentId);
  }

  @Post('checkout-session')
  @Roles('MANAGER', 'AGENT', 'SYSTEM')
  createCheckoutSession(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentService.createCheckoutSession(dto.appointmentId);
  }

  @Post('webhook')
  @Public()
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(req.rawBody!, signature);
  }

  @Get('mock-pay/:appointmentId')
  @Roles('MANAGER')
  async mockPay(@Param('appointmentId') appointmentId: string, @Res() res: Response) {
    if (process.env.MOCK_PAYMENTS !== 'true') {
      res.status(404).send('Not found');
      return;
    }
    await this.paymentService.mockPay(appointmentId);
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pago exitoso (MVP)</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0fdf4}
.card{text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.1)}
h1{color:#16a34a;font-size:2rem;margin-bottom:.5rem}p{color:#374151}.badge{display:inline-block;margin-top:1rem;padding:.25rem .75rem;background:#fef9c3;color:#854d0e;border-radius:999px;font-size:.8rem}</style></head>
<body><div class="card"><h1>✅ ¡Pago recibido!</h1>
<p>Tu cita está confirmada.<br>Recibirás un mensaje de confirmación por WhatsApp.</p>
<span class="badge">Modo MVP — pago simulado</span></div></body></html>`);
  }

  @Get('success')
  @Public()
  async paymentSuccess(@Res() res: Response) {
    // Appointment confirmation is handled exclusively by the Stripe webhook (POST /webhook).
    // This endpoint only renders the thank-you page so we avoid replay attacks via captured session_id URLs.
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pago exitoso</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0fdf4}
.card{text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.1)}
h1{color:#16a34a;font-size:2rem;margin-bottom:.5rem}p{color:#374151}</style></head>
<body><div class="card"><h1>✅ ¡Pago recibido!</h1>
<p>Tu cita está confirmada.<br>Recibirás un mensaje de confirmación por WhatsApp.</p></div></body></html>`);
  }

  @Get('cancel')
  @Public()
  paymentCancel(@Res() res: Response) {
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pago cancelado</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#fef2f2}
.card{text-align:center;padding:2rem;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.1)}
h1{color:#dc2626;font-size:2rem;margin-bottom:.5rem}p{color:#374151}</style></head>
<body><div class="card"><h1>❌ Pago cancelado</h1>
<p>No se realizó ningún cargo.<br>Escríbenos por WhatsApp para reagendar tu cita.</p></div></body></html>`);
  }

  @Get(':id')
  @Roles('MANAGER')
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }
}
