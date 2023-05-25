// expressTypes.ts

import express from 'express';
import { User } from '../database/entity/user.entity'

export interface RequestWithUser extends express.Request {
  user?: User;
}