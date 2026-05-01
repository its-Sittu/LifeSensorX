import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Contact {
  id: string;
  name: string;
  phone: string;
}

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
}

interface EmergencyState {
  isEmergencyMode: boolean;
  contacts: Contact[];
  location: LocationData;
  triggerEmergency: () => void;
  cancelEmergency: () => void;
  addContact: (contact: Omit<Contact, 'id'>) => void;
  removeContact: (id: string) => void;
  setLocation: (loc: Partial<LocationData>) => void;
}

export const useEmergencyStore = create<EmergencyState>()(
  persist(
    (set) => ({
      isEmergencyMode: false,
      contacts: [
        { id: '1', name: 'Emergency Monitor', phone: '+19897877228' }
      ],
      location: { latitude: null, longitude: null, error: null },
      hospitals: [],

      triggerEmergency: () => set({ isEmergencyMode: true }),
      cancelEmergency: () => set({ isEmergencyMode: false }),

      addContact: (contact) =>
        set((state) => ({
          contacts: [...state.contacts, { ...contact, id: crypto.randomUUID() }].slice(0, 5)
        })),

      removeContact: (id) =>
        set((state) => ({
          contacts: state.contacts.filter(c => c.id !== id)
        })),

      setLocation: (loc) =>
        set((state) => ({
          location: { ...state.location, ...loc }
        })),

      setHospitals: (hospitals) => set({ hospitals })
    }),
    {
      name: 'lifesensorx-storage',
      partialize: (state) => ({ contacts: state.contacts }), // Only persist contacts
    }
  )
);
