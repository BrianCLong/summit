import { useState } from 'react';
import { Card, CardHeader, CardContent, Collapse, List, ListItem, ListItemText, Button } from '@mui/material';
import AnswerStream from './AnswerStream';

export default function AnswerWithCitations({ question }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  const ask = async () => {
    // This component will now primarily trigger the streaming component
    // and display its output. The actual fetch logic is in AnswerStream.
    // We might still use this 'ask' to trigger a re-render of AnswerStream
    // or to manage the question state.
    setData({ question: question }); // Simply pass the question to trigger AnswerStream
  };

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardHeader
        title="Answer"
        action={<Button variant="contained" onClick={ask}>Ask</Button>}
      />
      <CardContent>
        {data?.question && <AnswerStream question={data.question} />}
      </CardContent>
    </Card>
  );
}