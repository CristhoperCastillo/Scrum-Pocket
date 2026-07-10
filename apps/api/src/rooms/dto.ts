import { IsString, MinLength, Length } from 'class-validator';
export class CreateRoomDto { @IsString() @MinLength(1) name: string; }
export class JoinRoomDto { @IsString() @Length(6, 6) inviteCode: string; }
