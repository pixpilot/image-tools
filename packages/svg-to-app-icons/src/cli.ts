#!/usr/bin/env node
import process from 'node:process';
import { runCli } from './run-cli';

const ARGUMENT_OFFSET = 2;
void runCli(process.argv.slice(ARGUMENT_OFFSET));
