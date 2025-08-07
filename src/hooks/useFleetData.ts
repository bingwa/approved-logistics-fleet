'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch all trucks
export function useTrucks() {
  return useQuery({
    queryKey: ['trucks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  })
}

// Fetch maintenance records
export function useMaintenanceRecords() {
  return useQuery({
    queryKey: ['maintenance_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          trucks (
            registration_number,
            make,
            model
          )
        `)
        .order('service_date', { ascending: false })
      
      if (error) throw error
      return data
    }
  })
}

// Fetch fuel records
export function useFuelRecords() {
  return useQuery({
    queryKey: ['fuel_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_records')
        .select(`
          *,
          trucks (
            registration_number,
            make,
            model
          )
        `)
        .order('fuel_date', { ascending: false })
      
      if (error) throw error
      return data
    }
  })
}

// Add truck mutation
export function useAddTruck() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (truck: any) => {
      const { data, error } = await supabase
        .from('trucks')
        .insert(truck)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] })
    }
  })
}
