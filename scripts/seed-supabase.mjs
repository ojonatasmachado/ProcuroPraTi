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

async function clearTables() {
  console.log('Clearing existing Supabase tables...');
  const deletionOrder = ['responses', 'procuras', 'messages', 'feedbacks', 'companies', 'users'];
  for (const table of deletionOrder) {
    const { error } = await supabase.from(table).delete().neq('id', '');
    if (error) throw error;
  }
}

async function seed() {
  try {
    console.log('Generating mock data...');
    const users = generateInitialUsers(150);
    const companies = generateInitialCompanies(50);
    const procuras = generateInitialProcuras(200, users, companies);
    const chats = generateInitialChats(users, companies, 100);
    const feedbacks = generateInitialFeedbacks(users, companies, 80);

    await clearTables();
    console.log('Inserting users...');
    for (const chunk of chunkArray(users, 100)) {
      const normalizedUsers = chunk.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        phone: user.phone,
        location: user.location,
        created_at: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        terms_accepted_date: user.termsAcceptedDate ? new Date(user.termsAcceptedDate).toISOString() : null
      }));
      const { error } = await supabase.from('users').insert(normalizedUsers);
      if (error) throw error;
    }

    console.log('Inserting companies...');
    for (const chunk of chunkArray(companies, 100)) {
      const normalizedCompanies = chunk.map(company => ({
        id: company.id,
        name: company.name,
        email: company.email,
        password: company.password,
        phone: company.phone,
        cnpj: company.cnpj,
        address: company.address,
        serves_locations: company.servesLocations || [],
        validation_status: company.validationStatus || null,
        validation_reason: company.validationReason || null,
        vehicle_types: company.vehicleTypes || [],
        created_at: company.createdAt ? new Date(company.createdAt).toISOString() : null,
        terms_accepted_date: company.termsAcceptedDate ? new Date(company.termsAcceptedDate).toISOString() : null,
        payment_exempt_until: company.paymentExemptUntil ? new Date(company.paymentExemptUntil).toISOString() : null
      }));
      const { error } = await supabase.from('companies').insert(normalizedCompanies);
      if (error) throw error;
    }

    console.log('Inserting procuras and responses...');
    for (const procura of procuras) {
      const { responses, ...procuraRow } = procura;
      const normalizedProcura = {
        id: procuraRow.id,
        user_id: procuraRow.userId,
        vehicle_type: procuraRow.vehicleType,
        vehicle_brand: procuraRow.vehicleBrand,
        vehicle_model: procuraRow.vehicleModel,
        vehicle_year: procuraRow.vehicleYear,
        part_name: procuraRow.partName,
        part_description: procuraRow.partDescription,
        wants_photos: procuraRow.wantsPhotos,
        locations: procuraRow.locations,
        created_at: procuraRow.createdAt ? new Date(procuraRow.createdAt).toISOString() : null,
        status: procuraRow.status,
        duration: procuraRow.duration,
      };

      const { error: e1 } = await supabase.from('procuras').insert(normalizedProcura);
      if (e1) throw e1;

      if (Array.isArray(responses) && responses.length) {
        for (const r of responses) {
          const responseRow = {
            ...r,
            procura_id: procura.id,
            company_id: r.companyId,
            company_name: r.companyName,
            response_date: r.responseDate ? new Date(r.responseDate).toISOString() : null,
            part_condition: r.partCondition,
            part_type: r.partType,
            photo_url: r.photoUrl,
            is_read_by_user: r.isReadByUser,
            is_read_by_company: r.isReadByCompany,
          };
          delete responseRow.companyId;
          delete responseRow.companyName;
          delete responseRow.responseDate;
          delete responseRow.partCondition;
          delete responseRow.partType;
          delete responseRow.photoUrl;
          delete responseRow.isReadByUser;
          delete responseRow.isReadByCompany;

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
        const messageRow = {
          id: m.id,
          chat_id: m.chatId,
          sender_id: m.senderId,
          receiver_id: m.receiverId,
          text: m.text,
          timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : null,
          is_read: m.isRead,
        };
        const { error } = await supabase.from('messages').insert(messageRow);
        if (error) throw error;
      }
    }

    console.log('Inserting feedbacks...');
    for (const chunk of chunkArray(feedbacks, 100)) {
      const normalizedFeedbacks = chunk.map(feedback => ({
        id: feedback.id,
        user_id: feedback.userId,
        user_type: feedback.userType,
        user_name: feedback.userName,
        type: feedback.type,
        text_content: feedback.text,
        rating: feedback.rating,
        contact: feedback.contact,
        created_at: feedback.createdAt ? new Date(feedback.createdAt).toISOString() : null,
      }));
      const { error } = await supabase.from('feedbacks').insert(normalizedFeedbacks);
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
