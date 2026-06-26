export class CreateCreditDto {
  clientId!: string;
  amount!: number;
  type!: string;
  description?: string;
}
