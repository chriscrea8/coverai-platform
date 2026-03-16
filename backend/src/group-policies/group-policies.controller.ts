import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GroupPoliciesService } from './group-policies.service';

@ApiTags('Group Policies')
@Controller('group-policies')
@UseGuards(AuthGuard('jwt'))
export class GroupPoliciesController {
  constructor(private readonly groupPoliciesService: GroupPoliciesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a group/fleet policy' })
  create(@Req() req: any, @Body() dto: any) {
    return this.groupPoliciesService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my group policies' })
  findAll(@Req() req: any) {
    return this.groupPoliciesService.findByOwner(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group policy details' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.groupPoliciesService.findOne(id, req.user.id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to group policy' })
  addMember(@Param('id') id: string, @Req() req: any, @Body() member: any) {
    return this.groupPoliciesService.addMember(id, req.user.id, member);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove member from group policy' })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Req() req: any) {
    return this.groupPoliciesService.removeMember(id, req.user.id, memberId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group policy' })
  update(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.groupPoliciesService.update(id, req.user.id, dto);
  }
}
