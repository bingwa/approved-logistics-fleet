// src/components/forms/AddFuelRecordForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Loader2, Calculator, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { cn, formatKSH } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileUpload } from '@/components/ui/FileUpload'
import { FileViewer } from '@/components/ui/FileViewer'

const fuelRecordSchema = z.object({
  truck_id: z.string().min(1, 'Please select a truck'),
  fuel_date: z.date({
    required_error: 'Fuel date is required',
  }),
  liters: z.number().min(1, 'Liters must be at least 1'),
  cost_per_liter: z.number().min(0, 'Cost per liter must be positive'),
  route: z.string().min(1, 'Route is required'),
  odometer_reading: z.number().min(0, 'Odometer reading must be positive'),
  previous_odometer: z.number().min(0, 'Previous odometer reading must be positive'),
  receipt_number: z.string().optional(),
  attendant_name: z.string().min(1, 'Attendant name is required'),
  receipt_url: z.string().optional(),
})

type FuelRecordFormData = z.infer<typeof fuelRecordSchema>

// Truck interface
interface Truck {
  id: string
  registration: string
  make: string
  model: string
  currentMileage: number
  status: string
}

const kenyanRoutes = [
  { value: 'Nairobi-Mombasa', label: 'Nairobi - Mombasa (485km)', distance: 485 },
  { value: 'Nairobi-Kisumu', label: 'Nairobi - Kisumu (351km)', distance: 351 },
  { value: 'Nairobi-Eldoret', label: 'Nairobi - Eldoret (312km)', distance: 312 },
  { value: 'Nairobi-Meru', label: 'Nairobi - Meru (265km)', distance: 265 },
  { value: 'Mombasa-Malaba', label: 'Mombasa - Malaba (556km)', distance: 556 },
  { value: 'Nairobi-Nakuru', label: 'Nairobi - Nakuru (156km)', distance: 156 },
]

interface AddFuelRecordFormProps {
  onClose: () => void
}

export function AddFuelRecordForm({ onClose }: AddFuelRecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fuelDateOpen, setFuelDateOpen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<any>(null)
  const [receiptUrl, setReceiptUrl] = useState('')
  const [receiptFileName, setReceiptFileName] = useState('')
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [isLoadingTrucks, setIsLoadingTrucks] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FuelRecordFormData>({
    resolver: zodResolver(fuelRecordSchema),
    defaultValues: {
      fuel_date: new Date(),
      cost_per_liter: 167.06, // Current Kenya fuel price
      liters: 0,
      odometer_reading: 0,
      previous_odometer: 0,
    }
  })

  // Fetch trucks from API on component mount
  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        setIsLoadingTrucks(true)
        console.log('Fetching trucks from API...')
        
        const response = await fetch('/api/trucks')
        if (!response.ok) {
          throw new Error(`Failed to fetch trucks: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Fetched trucks data:', data)
        
        setTrucks(data.trucks || [])
      } catch (error) {
        console.error('Error fetching trucks:', error)
        // Set fallback empty array
        setTrucks([])
      } finally {
        setIsLoadingTrucks(false)
      }
    }
    
    fetchTrucks()
  }, [])

  const fuelDate = watch('fuel_date')
  const liters = watch('liters') || 0
  const costPerLiter = watch('cost_per_liter') || 0
  const odometerReading = watch('odometer_reading') || 0
  const previousOdometer = watch('previous_odometer') || 0
  const selectedTruckId = watch('truck_id')

  // Calculate totals
  const totalCost = liters * costPerLiter
  const distanceCovered = odometerReading - previousOdometer
  const efficiency = liters > 0 ? distanceCovered / liters : 0
  const costPerKm = distanceCovered > 0 ? totalCost / distanceCovered : 0

  // Get selected truck data
  const selectedTruck = trucks.find(truck => truck.id === selectedTruckId)

  // Generate automatic receipt number
  const generateReceiptNumber = () => {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
    const timeStr = today.getHours().toString().padStart(2, '0') + today.getMinutes().toString().padStart(2, '0')
    return `DEPOT-${dateStr}-${timeStr}`
  }

  // Handle file upload completion
  const handleReceiptUpload = (fileUrl: string, originalName: string) => {
    setReceiptUrl(fileUrl)
    setReceiptFileName(originalName)
    setValue('receipt_url', fileUrl)
  }

  const onSubmit = async (data: FuelRecordFormData) => {
    setIsSubmitting(true)
    console.log('Submitting fuel record form with data:', data)
    
    try {
      // Auto-generate receipt number if not provided
      const receiptNumber = data.receipt_number || generateReceiptNumber()
      
      const fuelRecordData = {
        truckId: data.truck_id,
        date: data.fuel_date,
        liters: data.liters,
        costPerLiter: data.cost_per_liter,
        route: data.route,
        odometerReading: data.odometer_reading,
        previousOdometer: data.previous_odometer,
        attendantName: data.attendant_name,
        receiptNumber,
        receiptUrl: data.receipt_url || null,
      }

      console.log('Sending request to /api/fuel with data:', fuelRecordData)

      const response = await fetch('/api/fuel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fuelRecordData),
      })

      const responseData = await response.json()
      console.log('API Response:', responseData)

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP error! status: ${response.status}`)
      }

      console.log('Fuel record created successfully:', responseData)
      
      // Show success message
      alert('Fuel record created successfully!')
      onClose()
      
    } catch (error) {
      console.error('Detailed error adding fuel record:', error)
      
      // Show specific error message to user
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred'
        
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Depot Information */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Company Fuel Depot</h3>
              <p className="text-blue-700 dark:text-blue-300">Current Rate: KSh 167.06 per liter</p>
              <p className="text-blue-700 dark:text-blue-300">Location: Approved Logistics Compound</p>
            </div>
            <div>
              <p className="text-blue-700 dark:text-blue-300">Attendant Required: Yes</p>
              <p className="text-blue-700 dark:text-blue-300">Receipt Auto-Generated: Yes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fuel Dispensing Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Truck Selection */}
          <div className="space-y-2">
            <Label htmlFor="truck_id">Truck *</Label>
            {isLoadingTrucks ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-slate-600">Loading trucks...</span>
              </div>
            ) : (
              <Select onValueChange={(value) => {
                console.log('Selected truck ID:', value)
                setValue('truck_id', value)
                const truck = trucks.find(t => t.id === value)
                if (truck) {
                  console.log('Setting previous odometer to:', truck.currentMileage)
                  setValue('previous_odometer', truck.currentMileage)
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select truck" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.length === 0 ? (
                    <SelectItem value="" disabled>No trucks available</SelectItem>
                  ) : (
                    trucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id}>
                        {truck.registration} - {truck.make} {truck.model}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            {errors.truck_id && (
              <p className="text-sm text-red-600">{errors.truck_id.message}</p>
            )}
            {selectedTruck && (
              <p className="text-sm text-slate-600">
                Current mileage: {selectedTruck.currentMileage.toLocaleString()} km
              </p>
            )}
          </div>

          {/* Fuel Date */}
          <div className="space-y-2">
            <Label>Fuel Date *</Label>
            <Popover open={fuelDateOpen} onOpenChange={setFuelDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fuelDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fuelDate ? format(fuelDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fuelDate}
                  onSelect={(date) => {
                    setValue('fuel_date', date!)
                    setFuelDateOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.fuel_date && (
              <p className="text-sm text-red-600">{errors.fuel_date.message}</p>
            )}
          </div>

          {/* Liters */}
          <div className="space-y-2">
            <Label htmlFor="liters">Liters *</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              {...register('liters', { valueAsNumber: true })}
            />
            {errors.liters && (
              <p className="text-sm text-red-600">{errors.liters.message}</p>
            )}
          </div>

          {/* Cost per Liter (fixed depot rate) */}
          <div className="space-y-2">
            <Label htmlFor="cost_per_liter">Depot Rate (KSh/L)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('cost_per_liter', { valueAsNumber: true })}
              readOnly
            />
            <p className="text-sm text-slate-600">Fixed company depot rate</p>
          </div>

          {/* Total Cost (calculated) */}
          <div className="space-y-2">
            <Label>Total Cost (KSh)</Label>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md border">
              <span className="text-lg font-semibold">KSh {totalCost.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Route Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Route */}
          <div className="space-y-2">
            <Label>Route *</Label>
            <Select onValueChange={(value) => {
              setValue('route', value)
              const route = kenyanRoutes.find(r => r.value === value)
              setSelectedRoute(route)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select route" />
              </SelectTrigger>
              <SelectContent>
                {kenyanRoutes.map((route) => (
                  <SelectItem key={route.value} value={route.value}>
                    {route.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.route && (
              <p className="text-sm text-red-600">{errors.route.message}</p>
            )}
            {selectedRoute && (
              <p className="text-sm text-slate-600">
                Expected distance: {selectedRoute.distance} km
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Odometer & Efficiency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Odometer & Efficiency Calculation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Previous Odometer */}
            <div className="space-y-2">
              <Label htmlFor="previous_odometer">Previous Odometer (km) *</Label>
              <Input
                type="number"
                min="0"
                {...register('previous_odometer', { valueAsNumber: true })}
              />
              {errors.previous_odometer && (
                <p className="text-sm text-red-600">{errors.previous_odometer.message}</p>
              )}
            </div>

            {/* Current Odometer */}
            <div className="space-y-2">
              <Label htmlFor="odometer_reading">Current Odometer (km) *</Label>
              <Input
                type="number"
                min="0"
                {...register('odometer_reading', { valueAsNumber: true })}
              />
              {errors.odometer_reading && (
                <p className="text-sm text-red-600">{errors.odometer_reading.message}</p>
              )}
            </div>
          </div>

          {/* Calculated Values */}
          {distanceCovered > 0 && efficiency > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {distanceCovered.toLocaleString()}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Distance (km)</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  efficiency > 2.5 ? 'text-green-600' :
                  efficiency >= 2.0 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {efficiency.toFixed(1)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Efficiency (km/L)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatKSH(costPerKm)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Cost per KM</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendant & Receipt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Attendant & Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Attendant Name */}
          <div className="space-y-2">
            <Label htmlFor="attendant_name">Fuel Attendant *</Label>
            <Input {...register('attendant_name')} />
            {errors.attendant_name && (
              <p className="text-sm text-red-600">{errors.attendant_name.message}</p>
            )}
          </div>

          {/* Receipt Number */}
          <div className="space-y-2">
            <Label htmlFor="receipt_number">Receipt Number</Label>
            <Input {...register('receipt_number')} />
            <p className="text-sm text-slate-600">
              Leave empty to auto-generate: DEPOT-YYYYMMDD-HHMM
            </p>
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>Upload Receipt</Label>
            <FileUpload
              onUploadComplete={handleReceiptUpload}
              category="fuel"
              accept=".jpg,.jpeg,.png,.pdf"
              maxSize={10}
              className="w-full"
            />
            <p className="text-sm text-slate-600">
              Upload fuel dispensing receipt (Max 10MB, JPEG, PNG or PDF only)
            </p>
            
            {receiptUrl && receiptFileName && (
              <div className="mt-4">
                <FileViewer
                  fileUrl={receiptUrl}
                  fileName={receiptFileName}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoadingTrucks}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording Fuel...
            </>
          ) : (
            'Record Fuel Dispensing'
          )}
        </Button>
      </div>
    </form>
  )
}
