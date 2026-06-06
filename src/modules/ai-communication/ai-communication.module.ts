import { Module } from '@nestjs/common';
import { AICommunicationService } from './ai-communication.service';
import { ResponseSafetyLayerService } from './response-safety-layer.service';
import { IntentParserService } from './intent-parser.service';

@Module({
  providers: [AICommunicationService, ResponseSafetyLayerService, IntentParserService],
  exports: [AICommunicationService, ResponseSafetyLayerService, IntentParserService],
})
export class AiCommunicationModule {}
