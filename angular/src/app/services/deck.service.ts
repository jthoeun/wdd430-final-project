import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Deck, DeckCard, Card } from '../models/tcg-models';

@Injectable({
  providedIn: 'root'
})
export class DeckService {
  private apiUrl = 'http://localhost:3000/api/decks';
  private currentDeckSubject = new BehaviorSubject<Deck | null>(null);
  public currentDeck$ = this.currentDeckSubject.asObservable();

  constructor(private http: HttpClient) {}

  
  getAllDecks(): Observable<Deck[]> {
    return this.http.get<Deck[]>(this.apiUrl);
  }

  getDeck(id: string): Observable<Deck> {
    return this.http.get<Deck>(`${this.apiUrl}/${id}`);
  }

  createDeck(deck: Deck): Observable<Deck> {
    return this.http.post<Deck>(this.apiUrl, deck);
  }

  updateDeck(id: string, deck: Deck): Observable<Deck> {
    return this.http.put<Deck>(`${this.apiUrl}/${id}`, deck);
  }

  deleteDeck(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  
  setCurrentDeck(deck: Deck | null): void {
    this.currentDeckSubject.next(deck);
  }

  getCurrentDeck(): Deck | null {
    return this.currentDeckSubject.value;
  }

  
  addCardToDeck(deck: Deck, card: Card, quantity: number = 1): Deck {
    const existingCard = deck.cards.find(dc => dc.card.id === card.id);
    
    if (existingCard) {
      existingCard.quantity = Math.min(existingCard.quantity + quantity, this.getMaxAllowed(card));
    } else {
      deck.cards.push({
        card,
        quantity: Math.min(quantity, this.getMaxAllowed(card))
      });
    }
    
    return { ...deck };
  }

  removeCardFromDeck(deck: Deck, cardId: string, quantity: number = 1): Deck {
    const cardIndex = deck.cards.findIndex(dc => dc.card.id === cardId);
    
    if (cardIndex !== -1) {
      deck.cards[cardIndex].quantity -= quantity;
      if (deck.cards[cardIndex].quantity <= 0) {
        deck.cards.splice(cardIndex, 1);
      }
    }
    
    return { ...deck };
  }

  // Utility Methods
  getTotalCards(deck: Deck): number {
    if (!deck.cards) return 0;
    return deck.cards.reduce((total, deckCard) => total + deckCard.quantity, 0);
  }

  getCardsByType(deck: Deck, supertype: string): DeckCard[] {
    if (!deck.cards) return [];
    return deck.cards.filter(dc => dc.card.supertype === supertype);
  }

  // Validation Methods
  isDeckValid(deck: Deck): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const totalCards = this.getTotalCards(deck);
    
    // Standard deck size is 60 cards
    if (totalCards !== 60) {
      errors.push(`Deck must have exactly 60 cards (currently has ${totalCards})`);
    }
    
    // Check card limits
    deck.cards.forEach(deckCard => {
      const maxAllowed = this.getMaxAllowed(deckCard.card);
      if (deckCard.quantity > maxAllowed) {
        errors.push(`Too many copies of ${deckCard.card.name} (max ${maxAllowed})`);
      }
    });

    // Check ACE SPEC rule (max 1 total)
    const aceSpecCards = deck.cards.filter(dc => 
      dc.card.subtypes && dc.card.subtypes.includes('ACE SPEC')
    );
    if (aceSpecCards.length > 1) {
      errors.push('Deck can only contain 1 ACE SPEC card');
    }

    // Check Radiant rule (max 1 total)
    const radiantCards = deck.cards.filter(dc => 
      dc.card.subtypes && dc.card.subtypes.includes('Radiant')
    );
    if (radiantCards.length > 1) {
      errors.push('Deck can only contain 1 Radiant Pokémon');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private getMaxAllowed(card: Card): number {
    // ACE SPEC and Radiant cards are limited to 1
    if (card.subtypes && (card.subtypes.includes('ACE SPEC') || card.subtypes.includes('Radiant'))) {
      return 1;
    }
    // Basic energy cards can have unlimited copies
    if (card.supertype === 'Energy' && card.subtypes && card.subtypes.includes('Basic')) {
      return 99;
    }
    // All other cards limited to 4 copies
    return 4;
  }
}