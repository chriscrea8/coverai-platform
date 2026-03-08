import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmeProfile } from './sme-profile.entity';
import { CreateSmeDto } from './sme.dto';

@Injectable()
export class SmeService {
  constructor(
    @InjectRepository(SmeProfile) private readonly smeRepo: Repository<SmeProfile>,
  ) {}

  async create(ownerId: string, dto: CreateSmeDto) {
    const existing = await this.smeRepo.findOne({ where: { ownerId } });
    if (existing) throw new ConflictException('SME profile already exists');
    const sme = this.smeRepo.create({ ...dto, ownerId });
    return this.smeRepo.save(sme);
  }

  async getProfile(ownerId: string) {
    const sme = await this.smeRepo.findOne({ where: { ownerId } });
    if (!sme) throw new NotFoundException('SME profile not found');
    return sme;
  }

  async updateProfile(ownerId: string, dto: Partial<CreateSmeDto>) {
    const sme = await this.getProfile(ownerId);
    Object.assign(sme, dto);
    return this.smeRepo.save(sme);
  }
}
