import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Roles } from '../../common/decorators/roles.decorator';
import { FinancialService } from './financial.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { CreateCreditDto } from './dto/create-credit.dto';
import { UpdateCreditDto } from './dto/update-credit.dto';

@Controller('financial')
export class FinancialController {
  constructor(
    private readonly financialService: FinancialService,
    private readonly jwtService: JwtService,
  ) {}

  private getActor(req: Record<string, unknown>): string {
    const headers = req['headers'] as Record<string, string>;
    const auth = headers?.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload = this.jwtService.decode(auth.slice(7)) as { email?: string } | null;
        return payload?.email ?? 'agent';
      } catch {
        /* */
      }
    }
    return 'agent';
  }

  @Get('summary')
  @Roles('MANAGER')
  getSummary() {
    return this.financialService.getSummary();
  }

  @Get('credits')
  @Roles('MANAGER', 'AGENT')
  getCredits() {
    return this.financialService.getCredits();
  }

  @Post('income')
  @Roles('MANAGER', 'AGENT')
  createIncome(@Body() dto: CreateIncomeDto, @Req() req: Record<string, unknown>) {
    return this.financialService.createIncome(dto, this.getActor(req));
  }

  @Post('credits')
  @Roles('MANAGER', 'AGENT')
  createCredit(@Body() dto: CreateCreditDto, @Req() req: Record<string, unknown>) {
    return this.financialService.createCredit(dto, this.getActor(req));
  }

  @Patch('credits/:id')
  @Roles('MANAGER', 'AGENT')
  updateCredit(@Param('id') id: string, @Body() dto: UpdateCreditDto) {
    return this.financialService.updateCredit(id, dto);
  }
}
