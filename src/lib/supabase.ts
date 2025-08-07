import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export type Database = {
  public: {
    Tables: {
      trucks: {
        Row: {
          id: string
          registration_number: string
          make: string
          model: string
          year: number | null
          current_mileage: number
          status: 'active' | 'maintenance' | 'inactive'
          ntsa_expiry: string | null
          insurance_expiry: string | null
          tgl_expiry: string | null
          compliance_status: 'expired' | 'expiring' | 'compliant'
          created_at: string
          updated_at: string
        }
        Insert: {
          registration_number: string
          make: string
          model: string
          year?: number | null
          current_mileage?: number
          status?: 'active' | 'maintenance' | 'inactive'
          ntsa_expiry?: string | null
          insurance_expiry?: string | null
          tgl_expiry?: string | null
        }
        Update: {
          current_mileage?: number
          status?: 'active' | 'maintenance' | 'inactive'
          ntsa_expiry?: string | null
          insurance_expiry?: string | null
          tgl_expiry?: string | null
        }
      }
      // Add other table types as needed...
    }
  }
}
