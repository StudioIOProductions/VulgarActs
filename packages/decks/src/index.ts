/**
 * The decks that ship with the game, as data. Each deck is a JSON file with a
 * stable id per card (so skip-rate analytics can retire cards later) and
 * variant groups: cards that are the same joke in new clothes, of which only
 * one is dealt per game.
 */
import type { DeckCard } from "@vulgar-acts/engine";
import starter from "../decks/starter.json";
import afterdark from "../decks/afterdark.json";

export interface Deck {
  id: string;
  title: string;
  description: string;
  rating: "17+" | "18+";
  price: number;
  language: string;
  version: number;
  /** Cover image path and the tile colours the deck picker uses. */
  art: string;
  color: string;
  ink: string;
  cards: { id: string; text: string }[];
  groups: string[][];
}

export const DECKS: Deck[] = [starter as Deck, afterdark as Deck];
export const deckById = (id: string) => DECKS.find((d) => d.id === id);

/** Every card from every deck, tagged with its deck, in the engine's shape. */
export const ALL_CARDS: DeckCard[] = DECKS.flatMap((d) => d.cards.map((c) => ({ id: c.id, text: c.text, deck: d.id })));
export const ALL_GROUPS: string[][] = DECKS.flatMap((d) => d.groups);

/** What the lobby shows: id, title, size, rating. Never the cards. */
export const DECK_SUMMARIES = DECKS.map((d) => ({ id: d.id, title: d.title, description: d.description, rating: d.rating, count: d.cards.length, price: d.price, art: d.art, color: d.color, ink: d.ink }));
