import fc from 'fast-check';
import { mapRow } from '../../services/ingest-wizard/src/map';

test('mapping never drops keys unintentionally', ()=>{
  fc.assert(fc.property(
    fc.dictionary(fc.string({minLength:1,maxLength:5}), fc.string()),
    fc.array(fc.record({ from: fc.string({minLength:1,maxLength:5}), to: fc.string({minLength:1,maxLength:5}) })),
    (row, mapping) => {
      const out = mapRow(row, mapping);
      for(const m of mapping){ if(row[m.from] !== undefined){ if(!(m.to in out)) return false; }
      }
      return true;
    }
  ));
});
