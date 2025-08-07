// src/components/forms/AddMaintenanceForm.tsx

'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Loader2, Plus, Trash2, Upload, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const sparePartSchema = z.object({
  name: z.string().min(1, 'Part name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  total_price: z.number().min(0, 'Total price must be positive'),
})

const maintenanceSchema = z.object({
  truck_id: z.string().min(1, 'Please select a truck'),
  service_date: z.date({
    required_error: 'Service date is required',
  }),
  service_type: z.enum(['MAINTENANCE', 'SERVICE'], {
    required_error: 'Please select service type',
  }),
  maintenance_category: z.enum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  labor_cost: z.number().min(0, 'Labor cost must be positive'),
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendor_location: z.string().optional(),
  technician_name: z.string().optional(),
  mileage_at_service: z.number().optional(),
  next_service_due: z.date().optional(),
  route_taken: z.string().optional(),
  spare_parts: z.array(sparePartSchema).optional(),
  receipt_file: z.any().optional(),
})

type MaintenanceFormData = z.infer<typeof maintenanceSchema>

// ✅ Fixed interface - changed from onClose to onSuccess and onCancel
interface AddMaintenanceFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function AddMaintenanceForm({ onSuccess, onCancel }: AddMaintenanceFormProps) {
  const [trucks, setTrucks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serviceDateOpen, setServiceDateOpen] = useState(false)
  const [nextServiceOpen, setNextServiceOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      service_date: new Date(),
      labor_cost: 0,
      spare_parts: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "spare_parts"
  })

  // ✅ FIXED: Use useEffect instead of useState to call fetchTrucks
  useEffect(() => {
    fetchTrucks()
  }, [])

  const fetchTrucks = async () => {
    try {
      const response = await fetch('/api/trucks')
      if (response.ok) {
        const data = await response.json()
        setTrucks(data.trucks || [])
      }
    } catch (error) {
      console.error('Error fetching trucks:', error)
      toast.error('Failed to load trucks')
    } finally {
      setIsLoading(false)
    }
  }

  const serviceDate = watch('service_date')
  const nextServiceDate = watch('next_service_due')
  const serviceType = watch('service_type')
  const spareParts = watch('spare_parts') || []

  // Calculate total parts cost
  const totalPartsCost = spareParts.reduce((sum, part) => sum + (part?.total_price || 0), 0)

  const addSparePart = () => {
    append({
      name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload only JPEG or PDF files')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }

      setUploadedFile(file)
      setValue('receipt_file', file)
    }
  }

  const onSubmit = async (data: MaintenanceFormData) => {
    setIsSubmitting(true)
    try {
      // Validate route requirement for maintenance
      if (data.service_type === 'MAINTENANCE' && !data.route_taken) {
        toast.error('Route is required for maintenance activities')
        setIsSubmitting(false)
        return
      }

      // Prepare data for API
      const maintenanceData = {
        truckId: data.truck_id,
        serviceDate: data.service_date.toISOString(),
        serviceType: data.service_type,
        maintenanceCategory: data.maintenance_category,
        description: data.description,
        laborCost: data.labor_cost,
        vendorName: data.vendor_name,
        vendorLocation: data.vendor_location || '',
        technicianName: data.technician_name || '',
        mileageAtService: data.mileage_at_service || null,
        nextServiceDue: data.next_service_due ? data.next_service_due.toISOString() : null,
        routeTaken: data.route_taken || '',
        receiptUrl: '', // Handle file upload separately if needed
        spareParts: spareParts.filter(part => part.name && part.quantity > 0).map(part => ({
          name: part.name,
          quantity: part.quantity,
          unitPrice: part.unit_price,
          totalPrice: part.total_price
        }))
      }

      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenanceData)
      })

      if (response.ok) {
        toast.success('Maintenance record created successfully!')
        onSuccess() // ✅ Use onSuccess instead of onClose
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create maintenance record')
      }
    } catch (error) {
      console.error('Error creating maintenance record:', error)
      toast.error('Failed to create maintenance record')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Truck Selection */}
            <div className="space-y-2">
              <Label htmlFor="truck_id">Truck *</Label>
              <Select onValueChange={(value) => setValue('truck_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select truck" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map((truck) => (
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

            {/* Service Date */}
            <div className="space-y-2">
              <Label>Service Date *</Label>
              <Popover open={serviceDateOpen} onOpenChange={setServiceDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !serviceDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {serviceDate ? format(serviceDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={serviceDate}
                    onSelect={(date) => {
                      setValue('service_date', date!)
                      setServiceDateOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.service_date && (
                <p className="text-sm text-red-600">{errors.service_date.message}</p>
              )}
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <Label htmlFor="service_type">Service Type *</Label>
              <Select onValueChange={(value) => setValue('service_type', value as 'MAINTENANCE' | 'SERVICE')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAINTENANCE">Maintenance (Route Required)</SelectItem>
                  <SelectItem value="SERVICE">Service (General)</SelectItem>
                </SelectContent>
              </Select>
              {errors.service_type && (
                <p className="text-sm text-red-600">{errors.service_type.message}</p>
              )}
              {serviceType === 'MAINTENANCE' && (
                <p className="text-sm text-blue-600">ℹ️ Route field becomes required for maintenance activities</p>
              )}
            </div>

            {/* Maintenance Category */}
            <div className="space-y-2">
              <Label htmlFor="maintenance_category">Category *</Label>
              <Select onValueChange={(value) => setValue('maintenance_category', value as 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                  <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
              {errors.maintenance_category && (
                <p className="text-sm text-red-600">{errors.maintenance_category.message}</p>
              )}
            </div>
          </div>

          {/* Route - Required for maintenance */}
          {serviceType === 'MAINTENANCE' && (
            <div className="space-y-2">
              <Label htmlFor="route_taken">Route Taken *</Label>
              <Select onValueChange={(value) => setValue('route_taken', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nairobi - Mombasa">Nairobi - Mombasa</SelectItem>
                  <SelectItem value="Nairobi - Kisumu">Nairobi - Kisumu</SelectItem>
                  <SelectItem value="Nairobi - Eldoret">Nairobi - Eldoret</SelectItem>
                  <SelectItem value="Mombasa - Malaba">Mombasa - Malaba</SelectItem>
                  <SelectItem value="Nairobi - Nakuru">Nairobi - Nakuru</SelectItem>
                  <SelectItem value="Other Route">Other Route</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-amber-600">⚠️ Route is mandatory for maintenance activities</p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Service Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the maintenance work performed..."
              {...register('description')}
              className="min-h-[100px]"
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spare Parts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Spare Parts & Items</CardTitle>
            <Button type="button" onClick={addSparePart} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Part {index + 1}</h4>
                <Button 
                  type="button" 
                  onClick={() => remove(index)} 
                  variant="ghost" 
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <Label>Part Name</Label>
                  <Input
                    {...register(`spare_parts.${index}.name`)}
                    placeholder="Enter part name"
                  />
                </div>
                
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    {...register(`spare_parts.${index}.quantity`, { 
                      valueAsNumber: true,
                      onChange: (e) => {
                        const quantity = parseInt(e.target.value) || 1
                        const unitPrice = spareParts[index]?.unit_price || 0
                        setValue(`spare_parts.${index}.total_price`, quantity * unitPrice)
                      }
                    })}
                  />
                </div>
                
                <div>
                  <Label>Unit Price (KSh)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`spare_parts.${index}.unit_price`, { 
                      valueAsNumber: true,
                      onChange: (e) => {
                        const unitPrice = parseFloat(e.target.value) || 0
                        const quantity = spareParts[index]?.quantity || 1
                        setValue(`spare_parts.${index}.total_price`, unitPrice * quantity)
                      }
                    })}
                  />
                </div>
                
                <div>
                  <Label>Total (KSh)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`spare_parts.${index}.total_price`, { valueAsNumber: true })}
                    readOnly
                  />
                </div>
              </div>
            </div>
          ))}

          {fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No spare parts added yet</p>
              <p className="text-sm">Click "Add Part" to add spare parts</p>
            </div>
          )}

          {fields.length > 0 && (
            <div className="text-right font-semibold">
              Total Parts Cost: KSh {totalPartsCost.toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost & Vendor Information */}
      <Card>
        <CardHeader>
          <CardTitle>Cost & Vendor Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="labor_cost">Labor Cost (KSh)</Label>
              <Input
                id="labor_cost"
                type="number"
                step="0.01"
                min="0"
                {...register('labor_cost', { valueAsNumber: true })}
              />
              {errors.labor_cost && (
                <p className="text-sm text-red-600">{errors.labor_cost.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Total Cost</Label>
              <div className="p-3 bg-muted rounded-md">
                <span className="text-lg font-semibold">
                  KSh {(watch('labor_cost') + totalPartsCost).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor_name">Service Provider *</Label>
              <Input
                id="vendor_name"
                placeholder="Enter vendor name"
                {...register('vendor_name')}
              />
              {errors.vendor_name && (
                <p className="text-sm text-red-600">{errors.vendor_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor_location">Vendor Location</Label>
              <Input
                id="vendor_location"
                placeholder="Enter vendor location"
                {...register('vendor_location')}
              />
            </div>
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label htmlFor="receipt_file">Receipt Upload</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="receipt_file"
                type="file"
                accept=".jpg,.jpeg,.pdf"
                onChange={handleFileUpload}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            {uploadedFile && (
              <p className="text-sm text-green-600 flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                {uploadedFile.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Upload receipt for parts purchased (Max 5MB, JPEG or PDF only)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mileage_at_service">Mileage at Service (km)</Label>
              <Input
                id="mileage_at_service"
                type="number"
                min="0"
                placeholder="Enter mileage"
                {...register('mileage_at_service', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="technician_name">Technician Name</Label>
              <Input
                id="technician_name"
                placeholder="Enter technician name"
                {...register('technician_name')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Next Service Due Date</Label>
            <Popover open={nextServiceOpen} onOpenChange={setNextServiceOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !nextServiceDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextServiceDate ? format(nextServiceDate, "PPP") : "Pick next service date (optional)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={nextServiceDate}
                  onSelect={(date) => {
                    setValue('next_service_due', date)
                    setNextServiceOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} // ✅ Use onCancel instead of onClose
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding Record...
            </>
          ) : (
            'Add Maintenance Record'
          )}
        </Button>
      </div>
    </form>
  )
}
