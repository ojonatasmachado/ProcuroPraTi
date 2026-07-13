#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  generateInitialUsers,
  generateInitialCompanies,
  generateInitialProcuras,
  generateInitialChats,
  generateInitialFeedbacks
} from '../src/lib/mockData.js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) must be set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function seed() {
  try {
    console.log('Generating mock data...');
    const users = generateInitialUsers(150);
    const companies = generateInitialCompanies(50);
    const procuras = generateInitialProcuras(200, users, companies);
    const chats = generateInitialChats(users, companies, 100);
    const feedbacks = generateInitialFeedbacks(users, companies, 80);

    console.log('Inserting users...');
    for (const chunk of chunkArray(users, 100)) {
      const { error } = await supabase.from('users').insert(chunk);
      if (error) throw error;
    }

    console.log('Inserting companies...');
    for (const chunk of chunkArray(companies, 100)) {
      const { error } = await supabase.from('companies').insert(chunk);
      if (error) throw error;
    }

    console.log('Inserting procuras and responses...');
    for (const procura of procuras) {
      const { responses, ...procuraRow } = procura;
      const { error: e1 } = await supabase.from('procuras').insert(procuraRow);
      if (e1) throw e1;
      if (Array.isArray(responses) && responses.length) {
        for (const r of responses) {
          const responseRow = { ...r, procura_id: procura.id };
          const { error: e2 } = await supabase.from('responses').insert(responseRow);
          if (e2) throw e2;
        }
      }
    }

    console.log('Inserting messages...');
    // messages returned as object keyed by chatId
    for (const chatId of Object.keys(chats)) {
      const msgs = chats[chatId];
      for (const m of msgs) {
        const { error } = await supabase.from('messages').insert(m);
        if (error) throw error;
      }
    }

    console.log('Inserting feedbacks...');
    for (const chunk of chunkArray(feedbacks, 100)) {
      const { error } = await supabase.from('feedbacks').insert(chunk);
      if (error) throw error;
    }

    console.log('Seeding completed successfully.');
  } catch (err) {
    console.error('Seeding error:', err.message || err);
    process.exit(1);
  }
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

seed();
