import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  return (
    <div className="relative max-w-2xl w-full mx-auto group">
      <input 
        type="text" 
        placeholder="Search for wisdom..." 
        onChange={(e) => onSearch(e.target.value)}
        className="w-full bg-transparent border-b border-white/10 py-4 px-0 text-xl font-light text-soft-white focus:outline-none focus:border-white/40 transition-all placeholder:text-muted-gray/50"
      />
      <Search className="absolute right-0 top-4 text-muted-gray group-focus-within:text-soft-white transition-colors" size={20} />
    </div>
  );
};
