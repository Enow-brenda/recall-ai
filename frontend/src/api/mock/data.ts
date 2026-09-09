import type {
  AccountSummary,
  ChatMessage,
  Conversation,
  ProviderInfo,
  Source,
  UsageStats,
  UserProfile,
} from '../types'

export interface AssistantReply {
  content: string
  sources: Source[]
}

export const MOCK_USER: UserProfile = {
  id: 'u_1f2e3d4c5b6a7a9a8b7c6d5e',
  name: 'Brenda Enow',
  primary_email: 'brenda.enow@gmail.com',
  profile_picture_url: 'https://i.pravatar.cc/96?img=47',
  plan: { id: 'p_free', name: 'Free', max_daily_queries: 25 },
  plan_usage: 12,
  last_plan_reset: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
}

export const MOCK_STATS: UsageStats = {
  emails_indexed: 1284,
  attachments: 34,
  links: 156,
  conversations: 3,
  messages_sent: 14,
  quota_used: 12,
  quota_limit: 25,
}

export const MOCK_PROVIDERS: ProviderInfo[] = [
  { key: 'gmail', display_name: 'Gmail', auth_type: 'oauth', is_active: true },
  { key: 'whatsapp', display_name: 'WhatsApp', auth_type: 'phone_verification', is_active: false },
  { key: 'slack', display_name: 'Slack', auth_type: 'oauth', is_active: false },
  { key: 'sms', display_name: 'SMS', auth_type: 'phone_verification', is_active: false },
]

export const MOCK_ACCOUNTS: AccountSummary[] = [
  {
    id: 'acct_work_001',
    provider_key: 'gmail',
    provider_display_name: 'Gmail',
    account_identifier: 'brenda.enow@gmail.com',
    display_label: 'Work Gmail',
    is_active: true,
    connected_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: 'acct_personal_002',
    provider_key: 'gmail',
    provider_display_name: 'Gmail',
    account_identifier: 'brenda.personal@gmail.com',
    display_label: 'Personal Gmail',
    is_active: false,
    connected_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
  },
]

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_001',
    title: 'Design agency invoice status',
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    last_modified_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'conv_002',
    title: 'Flight itinerary for Lagos trip',
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    last_modified_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: 'conv_003',
    title: 'Lease agreement — signed version',
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    last_modified_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
]

export const MOCK_MESSAGES: (conv: string) => ChatMessage[] = (conversationId) => {
  const t = Date.now()
  const messages: ChatMessage[] = [
    {
      id: 'msg_u_1',
      conversation_id: conversationId,
      direction: 'user',
      content: 'What was the flight number for my Lagos trip next week?',
      status: 'sent',
      sources: null,
      created_at: new Date(t - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: 'msg_a_1',
      conversation_id: conversationId,
      direction: 'assistant',
      content:
        'Your outbound flight is **AT 509**, departing Douala at **08:40** and landing in Lagos at **10:15** on Tuesday. The return leg is **AT 510** at **17:20** the same week.',
      status: 'sent',
      sources: [
        {
          type: 'email',
          ref_id: 'email_at_509',
          account_label: 'Work Gmail',
          subject: 'Your Air Atlas e-ticket — DLA → LOS',
          sender: 'Air Atlas <noreply@airatlas.com>',
          snippet: '…flight AT 509, seats 14A/B, check-in opens 24h before departure…',
          url: 'https://mail.google.com/mail/u/0/#inbox/em_at509',
        },
        {
          type: 'attachment',
          ref_id: 'attach_at_ticket',
          account_label: 'Work Gmail',
          snippet: 'e-ticket-air-atlas-DLA-LOS.pdf — boarding pass included',
        },
      ],
      created_at: new Date(t - 1000 * 60 * 60 * 2 + 4000).toISOString(),
    },
    {
      id: 'msg_u_2',
      conversation_id: conversationId,
      direction: 'user',
      content: 'Does the ticket include checked baggage?',
      status: 'sent',
      sources: null,
      created_at: new Date(t - 1000 * 60 * 30).toISOString(),
    },
  ]
  return messages
}

export const MOCK_ASSISTANT_REPLIES: AssistantReply[] = [
  {
    content:
      'Yes — your Air Atlas fare includes **1 checked bag (23 kg)** free of charge. The email notes an extra bag costs **₦45,000** if added at the airport versus **₦30,000** online.\n\nYou can add baggage from the **Manage Booking** link in the confirmation email.',
    sources: [
      {
        type: 'email',
        ref_id: 'email_at_509',
        account_label: 'Work Gmail',
        subject: 'Your Air Atlas e-ticket — DLA → LOS',
        sender: 'Air Atlas <noreply@airatlas.com>',
        snippet: '…baggage allowance: 1 piece, max 23 kg, included in fare…',
        url: 'https://mail.google.com/mail/u/0/#inbox/em_at509',
      },
    ],
  },
  {
    content:
      'The signed version came through on **Aug 28** from Apex Legal. I compared it with the draft:\n\n- Clauses **4.2** (payment terms) and **7.1** (termination) were updated\n- Addendum **B** about the notice period was **added**\n\nI found the final PDF attached to that email.',
    sources: [
      {
        type: 'email',
        ref_id: 'email_lease_signed',
        account_label: 'Personal Gmail',
        subject: 'Lease agreement — signed copy (final)',
        sender: 'Apex Legal <legal@apexlegal.com>',
        snippet: '…executed copy of the lease, replacing the draft of Aug 21…',
        url: 'https://mail.google.com/mail/u/0/#inbox/em_lease_signed',
      },
      {
        type: 'attachment',
        ref_id: 'attach_lease',
        account_label: 'Personal Gmail',
        snippet: 'lease-agreement-signed-final.pdf',
      },
    ],
  },
  {
    content:
      'The Safi Studio invoice **#2041** for your brand identity project is due on the **12th** and currently shows as **unpaid**. The note attached to it says a **5% late fee** applies after the 15th.',
    sources: [
      {
        type: 'email',
        ref_id: 'email_em_2041',
        account_label: 'Work Gmail',
        subject: 'Invoice #2041 — payment due',
        sender: 'Safi Studio <hello@safistudio.co>',
        snippet: '…the invoice for the brand identity project is due on the 12th…',
        url: 'https://mail.google.com/mail/u/0/#inbox/em_2041',
      },
      {
        type: 'link',
        ref_id: 'link_pay_2041',
        account_label: 'Work Gmail',
        snippet: 'Pay the invoice securely at https://safistudio.co/pay',
        url: 'https://safistudio.co/pay',
      },
    ],
  },
]