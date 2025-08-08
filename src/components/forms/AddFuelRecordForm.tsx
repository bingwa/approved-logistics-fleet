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
  onSubmitSuccess?: () => void // 👈 Add this prop
}

export function AddFuelRecordForm({ onClose, onSubmitSuccess }: AddFuelRecordFormProps) {
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
      cost_per_liter: 167.06,
      liters: 0,
      odometer_reading: 0,
      previous_odometer: 0,
    },
  })

  // Fetch trucks from API on component mount
  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        setIsLoadingTrucks(true)
        const response = await fetch('/api/trucks')
        if (response.ok) {
          const data = await response.json()
          // Handle different response formats
          let trucksArray: Truck[] = []
          if (data && data.trucks && Array.isArray(data.trucks)) {
            trucksArray = data.trucks
          } else if (Array.isArray(data)) {
            trucksArray = data
          } else {
            trucksArray = []
          }
          setTrucks(trucksArray)
        } else {
          console.error('Failed to fetch trucks:', response.status)
        }
      } catch (error) {
        console.error('Error fetching trucks:', error)
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
  const selectedTruck = Array.isArray(trucks) ? trucks.find(truck => truck.id === selectedTruckId) : undefined

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
    try {
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

      const response = await fetch('/api/fuel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fuelRecordData),
      })
      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP error! status: ${response.status}`)
      }

      alert('Fuel record created successfully!')
      onClose?.()
      onSubmitSuccess?.() // 👈 Trigger parent to refresh
    } catch (error) {
      console.error('Error adding fuel record:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto max-h-[85vh] overflow-y-auto">
      <CardHeader>
        <CardTitle>Add New Fuel Record</CardTitle>
        <CardDescription>
          Record fuel dispensing from the company depot
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-blue-800 font-semibold">Company Fuel Depot</h3>
              <p className="text-blue-600 text-sm">
                Current Rate: KSh 167.06 per liter • Location: Approved Logistics Compound •
                Attendant Required: Yes • Receipt Auto-Generated: Yes
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Fuel Dispensing Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="truck_id">Truck *</Label>
                <Select
                  onValueChange={(value) => {
                    setValue('truck_id', value)
                    const truck = Array.isArray(trucks) ? trucks.find(t => t.id === value) : undefined
                    if (truck) {
                      setValue('previous_odometer', truck.currentMileage)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      isLoadingTrucks
                        ? "Loading trucks..."
                        : !Array.isArray(trucks) || trucks.length === 0
                          ? "No trucks available"
                          : "Select a truck"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(trucks) && trucks.length > 0 && trucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id}>
                        {truck.registration} - {truck.make} {truck.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.truck_id && (
                  <p className="text-sm text-red-600">{errors.truck_id.message}</p>
                )}
              </div>

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
                  <PopoverContent className="w-auto p-0">
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

              <div className="space-y-2">
                <Label htmlFor="liters">Liters *</Label>
                <Input
                  id="liters"
                  type="number"
                  step="0.1"
                  min="0"
                  {...register('liters', { valueAsNumber: true })}
                />
                {errors.liters && (
                  <p className="text-sm text-red-600">{errors.liters.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_per_liter">Depot Rate (KSh/L)</Label>
                <Input
                  id="cost_per_liter"
                  type="number"
                  step="0.01"
                  readOnly
                  className="bg-gray-50"
                  {...register('cost_per_liter', { valueAsNumber: true })}
                />
                <p className="text-xs text-gray-500">Fixed company depot rate</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Total Cost (KSh)</Label>
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <span className="text-lg font-semibold text-green-700">
                    KSh {totalCost.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Route Information</h3>
            <div className="space-y-2">
              <Label>Route *</Label>
              <Select
                onValueChange={(value) => {
                  setValue('route', value)
                  const route = kenyanRoutes.find(r => r.value === value)
                  setSelectedRoute(route)
                }}
              >
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
                <p className="text-sm text-blue-600">
                  Expected distance: {selectedRoute.distance} km
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Odometer & Efficiency Calculation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="previous_odometer">Previous Odometer (km) *</Label>
                <Input
                  id="previous_odometer"
                  type="number"
                  min="0"
                  readOnly
                  className="bg-gray-50"
                  {...register('previous_odometer', { valueAsNumber: true })}
                />
                {errors.previous_odometer && (
                  <p className="text-sm text-red-600">{errors.previous_odometer.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="odometer_reading">Current Odometer (km) *</Label>
                <Input
                  id="odometer_reading"
                  type="number"
                  min="0"
                  {...register('odometer_reading', { valueAsNumber: true })}
                />
                {errors.odometer_reading && (
                  <p className="text-sm text-red-600">{errors.odometer_reading.message}</p>
                )}
              </div>
            </div>

            {distanceCovered > 0 && efficiency > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">Calculated Values</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {distanceCovered.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Distance (km)</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${efficiency >= 2.5 ? 'text-green-600' : efficiency >= 2.0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {efficiency.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Efficiency (km/L)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {formatKSH(costPerKm)}
                    </div>
                    <div className="text-sm text-gray-600">Cost per KM</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Attendant & Documentation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attendant_name">Fuel Attendant *</Label>
                <Input
                  id="attendant_name"
                  {...register('attendant_name')}
                />
                {errors.attendant_name && (
                  <p className="text-sm text-red-600">{errors.attendant_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt_number">Receipt Number</Label>
                <Input
                  id="receipt_number"
                  placeholder="Auto-generated"
                  {...register('receipt_number')}
                />
                <p className="text-xs text-gray-500">
                  Leave empty to auto-generate: DEPOT-YYYYMMDD-HHMM
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Upload Receipt (Optional)</Label>
                <FileUpload onUploadComplete={handleReceiptUpload} />
                <p className="text-xs text-gray-500">
                  Upload fuel dispensing receipt (Max 10MB, JPEG, PNG or PDF only)
                </p>
                {receiptUrl && receiptFileName && (
                  <FileViewer url={receiptUrl} fileName={receiptFileName} />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t bg-white sticky bottom-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
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
      </CardContent>
    </Card>
  )
}
