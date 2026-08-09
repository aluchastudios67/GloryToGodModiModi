import { create } from 'zustand';
import {
  Booking,
  Conversation,
  DogRequest,
  Message,
  bookings as seedBookings,
  conversations as seedConversations,
} from '../data/mock';

/** The app is one binary: you are either booking a walk or doing one. */
export type Role = 'owner' | 'walker';

export type ToastTone = 'success' | 'neutral';

type AppState = {
  /* role ------------------------------------------------------------- */
  role: Role;
  setRole: (role: Role) => void;

  /* walker availability ---------------------------------------------- */
  isAvailable: boolean;
  setAvailable: (value: boolean) => void;

  /* bookings ---------------------------------------------------------- */
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  completeBooking: (id: string) => void;

  /* walker inbox ------------------------------------------------------ */
  /** Requests the walker has swiped away — hidden from the list. */
  declinedRequestIds: string[];
  acceptedRequestIds: string[];
  acceptRequest: (request: DogRequest) => Booking;
  declineRequest: (id: string) => void;

  /* chat -------------------------------------------------------------- */
  threads: Record<string, Message[]>;
  sendMessage: (conversationId: string, text: string) => void;

  /* ratings ----------------------------------------------------------- */
  ratings: Record<string, number>;
  rateWalk: (bookingId: string, stars: number) => void;

  /* toast ------------------------------------------------------------- */
  toast: { message: string; tone: ToastTone } | null;
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
};

const seedThreads = (list: Conversation[]) =>
  list.reduce<Record<string, Message[]>>((acc, c) => {
    acc[c.id] = c.messages;
    return acc;
  }, {});

let seq = 0;
const nextId = (prefix: string) => `${prefix}${Date.now()}${seq++}`;

export const useAppStore = create<AppState>((set, get) => ({
  role: 'owner',
  setRole: (role) => set({ role }),

  isAvailable: false,
  setAvailable: (value) => set({ isAvailable: value }),

  bookings: seedBookings,
  addBooking: (booking) => set((s) => ({ bookings: [booking, ...s.bookings] })),
  completeBooking: (id) =>
    set((s) => {
      const target = s.bookings.find((b) => b.id === id);
      // Returning the same state is a real no-op in zustand — without this
      // guard, re-completing an already-done walk hands out a fresh booking
      // object every call and any effect watching it loops forever.
      if (!target || target.status === 'done') return s;
      return {
        bookings: s.bookings.map((b) =>
          b.id === id ? { ...b, status: 'done' as const } : b
        ),
      };
    }),

  declinedRequestIds: [],
  acceptedRequestIds: [],
  acceptRequest: (request) => {
    const booking: Booking = {
      id: nextId('b'),
      dog: request.dog,
      walkerId: 'me',
      walkerName: request.owner,
      walkerPhoto: request.dog.photo,
      when: request.when.kind === 'now' ? 'ახლა' : request.when.label,
      durationMin: 30,
      total: request.payout,
      status: 'upcoming',
      address: request.address,
    };
    set((s) => ({
      acceptedRequestIds: [...s.acceptedRequestIds, request.id],
      bookings: [booking, ...s.bookings],
    }));
    return booking;
  },
  declineRequest: (id) =>
    set((s) => ({ declinedRequestIds: [...s.declinedRequestIds, id] })),

  threads: seedThreads(seedConversations),
  sendMessage: (conversationId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const message: Message = { id: nextId('m'), from: 'me', text: trimmed, time };
    set((s) => ({
      threads: {
        ...s.threads,
        [conversationId]: [...(s.threads[conversationId] ?? []), message],
      },
    }));
  },

  ratings: {},
  rateWalk: (bookingId, stars) =>
    set((s) => ({ ratings: { ...s.ratings, [bookingId]: stars } })),

  toast: null,
  showToast: (message, tone = 'neutral') => set({ toast: { message, tone } }),
  hideToast: () => {
    if (get().toast) set({ toast: null });
  },
}));

/** Narrow selectors keep screens from re-rendering on unrelated state changes. */
export const useRole = () => useAppStore((s) => s.role);
export const useIsOwner = () => useAppStore((s) => s.role === 'owner');
