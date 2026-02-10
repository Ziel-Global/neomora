import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Mail, Phone, MessageSquare } from 'lucide-react';

const SupportPage: React.FC = () => {
  const faqs = [
    { q: 'How do I update my registration details?', a: 'Contact our support team or log in to your participant portal to request changes.' },
    { q: 'What documents do I need for visa processing?', a: 'Required documents include passport copy, photo, invitation letter, and bank statement depending on nationality.' },
    { q: 'How will I receive my badge?', a: 'Badges can be collected at the registration desk upon arrival at the venue.' },
    { q: 'Can I change my travel dates?', a: 'Travel changes must be requested at least 7 days before departure. Contact the travel desk.' },
  ];

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">Support Center</h1>
      
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5" /> Email Support</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">support@eventems.com</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Phone className="h-5 w-5" /> Phone Support</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">+971 4 123 4567</p></CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle>Frequently Asked Questions</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Contact Us</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Your Name" />
          <Input placeholder="Email Address" type="email" />
          <Textarea placeholder="How can we help?" rows={4} />
          <Button className="w-full">Send Message</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportPage;
