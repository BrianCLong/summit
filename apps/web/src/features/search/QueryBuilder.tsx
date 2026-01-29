// @ts-nocheck
import React, { useState } from 'react';
import { Search, Plus, Trash, Filter, Save, Calendar, User, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/Badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';

type FilterType = 'entity' | 'date' | 'status' | 'relationship';

interface FilterItem {
  id: string;
  type: FilterType;
  value: string;
  operator?: string;
}

export function QueryBuilder({ onSearch }: { onSearch: (query: string) => void }) {
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [term, setTerm] = useState('');

  const addFilter = (type: FilterType) => {
    setFilters([...filters, { id: Math.random().toString(), type, value: '' }]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, value: string, operator?: string) => {
    setFilters(filters.map(f => (f.id === id ? { ...f, value, operator } : f)));
  };

  const constructQuery = () => {
    let q = term;
    filters.forEach(f => {
      if (!f.value) return;
      if (f.type === 'date') {
        q += ` ${f.operator || 'since'}:${f.value}`;
      } else if (f.type === 'relationship') {
        q += ` rel:${f.value}`;
      } else {
        q += ` ${f.type}:${f.value}`;
      }
    });
    return q.trim();
  };

  const handleSearch = () => {
    onSearch(constructQuery());
  };

  return (
    <div className="p-4 space-y-4 border rounded-md bg-card">
      <div className="flex gap-2">
        <Input
          placeholder="Natural language search (e.g. 'Cases involving Intel last week')"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => (
            <div key={filter.id} className="flex items-center gap-2 p-2 text-sm border rounded bg-background">
              <span className="font-medium capitalize text-muted-foreground">{filter.type}</span>

              {filter.type === 'date' && (
                <Select
                  value={filter.operator || 'since'}
                  onValueChange={(val) => updateFilter(filter.id, filter.value, val)}
                >
                  <SelectTrigger className="h-8 w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="since">Since</SelectItem>
                    <SelectItem value="before">Before</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Input
                className="h-8 w-[150px]"
                placeholder="Value..."
                value={filter.value}
                onChange={(e) => updateFilter(filter.id, e.target.value, filter.operator)}
              />

              <Button variant="ghost" size="sm" onClick={() => removeFilter(filter.id)}>
                <Trash className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 border-dashed">
                <Plus className="w-4 h-4 mr-2" /> Add Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="grid gap-1">
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => addFilter('entity')}>
                  <User className="w-4 h-4 mr-2" /> Entity
                </Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => addFilter('date')}>
                  <Calendar className="w-4 h-4 mr-2" /> Date
                </Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => addFilter('relationship')}>
                  <GitBranch className="w-4 h-4 mr-2" /> Relationship
                </Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => addFilter('status')}>
                  <Filter className="w-4 h-4 mr-2" /> Status
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
