export class CreateIncomeDto {
  amount!: number;
  type!: string;
  description?: string;
  clientId?: string;
  recordedAt?: string;
}
