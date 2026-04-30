import React, { useState } from 'react';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { UserPlus, Trash2, Phone } from 'lucide-react';

const ContactsManager: React.FC = () => {
  const { contacts, addContact, removeContact } = useEmergencyStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && phone.trim() && contacts.length < 5) {
      addContact({ name: name.trim(), phone: phone.trim() });
      setName('');
      setPhone('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Emergency Contacts</h3>
        <span className="text-xs font-medium text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
          {contacts.length} / 5
        </span>
      </div>

      {contacts.length === 0 && !isAdding && (
        <div className="glass-card p-6 flex flex-col items-center text-center border-dashed border-zinc-700/50">
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3 text-zinc-500">
            <UserPlus size={24} />
          </div>
          <p className="text-sm text-zinc-400 mb-4">No emergency contacts added yet. Add trusted contacts to notify them in case of an emergency.</p>
          <button 
            onClick={() => setIsAdding(true)}
            className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            + Add First Contact
          </button>
        </div>
      )}

      {contacts.length > 0 && (
        <div className="flex flex-col gap-2">
          {contacts.map(contact => (
            <div key={contact.id} className="glass-card p-4 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <span className="font-semibold text-sm">{contact.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{contact.name}</p>
                  <p className="text-xs text-zinc-400 font-mono">{contact.phone}</p>
                </div>
              </div>
              <button 
                onClick={() => removeContact(contact.id)}
                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="glass-card p-4 flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="Contact Name" 
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <input 
            type="tel" 
            placeholder="Phone Number (e.g. +1234567890)" 
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <div className="flex gap-2 mt-2">
            <button 
              type="button"
              onClick={() => setIsAdding(false)}
              className="flex-1 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!name.trim() || !phone.trim()}
              className="flex-1 py-2 bg-white text-black rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity"
            >
              Save Contact
            </button>
          </div>
        </form>
      )}

      {!isAdding && contacts.length > 0 && contacts.length < 5 && (
        <button 
          onClick={() => setIsAdding(true)}
          className="glass-card p-4 flex items-center justify-center gap-2 text-sm font-medium text-blue-400 hover:bg-zinc-800/50 transition-colors border-dashed"
        >
          <UserPlus size={16} />
          Add Another Contact
        </button>
      )}
    </div>
  );
};

export default ContactsManager;
