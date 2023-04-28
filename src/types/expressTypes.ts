// expressTypes.ts

import express from 'express';
import { User } from '../entity/User'

export interface RequestWithUser extends express.Request {
  user?: User;
}