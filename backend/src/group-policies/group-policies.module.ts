import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupPolicy } from './group-policy.entity';
import { GroupPoliciesService } from './group-policies.service';
import { GroupPoliciesController } from './group-policies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GroupPolicy])],
  controllers: [GroupPoliciesController],
  providers: [GroupPoliciesService],
  exports: [GroupPoliciesService],
})
export class GroupPoliciesModule {}
