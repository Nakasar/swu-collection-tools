'use server';

import 'server-only';

import {MeiliSearch} from "meilisearch";
import clientPromise from "@/lib/mongo";

const meiliClient = new MeiliSearch({
  host: 'http://127.0.0.1:7700',
});

export type Card = {
  id: string;
  imageUrl: string;
  lang: string;
  setCode: "string";
  collectorNumber: "string";
  name: "string";
  subtitle: "string";
  traits: string[];
  type: "string";
  arenas: string[];
  text: "string";
  price: "string";
  foilPrice: "string";
  rarity: "string";
  cost: number;
  hp: number;
  power: number;
};

export async function importCardDatabase() {
  console.info('Importing cards database...');

  const cardsResult = await fetch('https://api.dotgg.gg/cgfw/getcards?game=starwars');

  if (!cardsResult.ok) {
    console.error('Failed to fetch cards database');
    return;
  }

  const cardsRaw = await cardsResult.json();

  const cardsIndex = meiliClient.index('swu-cards');

  const mongoClient = await clientPromise;
  const db = mongoClient.db(process.env.MONGODB_DBNAME);

  let cards = [];

  const batchSize = 50000;

  for (const cardRaw of cardsRaw) {
    cards.push({
      id: cardRaw.id,
      imageUrl: `https://static.dotgg.gg/starwars/card/${cardRaw.id}.webp`,
      lang: 'en',
      setCode: cardRaw.setId,
      collectorNumber: cardRaw.number,
      name: cardRaw.name,
      subtitle: cardRaw.name,
      traits: JSON.parse(cardRaw.traits),
      type: cardRaw.type,
      arenas: JSON.parse(cardRaw.arenas),
      text: cardRaw.text,
      price: cardRaw.price,
      foilPrice: cardRaw.foilPrice,
      rarity: cardRaw.rarity,
      cost: cardRaw.cost,
      hp: cardRaw.hp,
      power: cardRaw.power,
    });

    if (cards.length >= batchSize) {
      await cardsIndex.addDocuments(cards);
      await db.collection('cards').insertMany(cards);
      cards = [];

      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }

  if (cards.length > 0) {
    await cardsIndex.addDocuments(cards);
    await db.collection('cards').insertMany(cards);
  }

  console.info('Cards database imported!')
}