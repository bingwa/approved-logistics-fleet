'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Loader2, Plus, Trash2, Upload } from 'lucide-react'
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
  service_date: z.date({ required_error: 'Service date is required' }),
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

interface AddMaintenanceFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function AddMaintenanceForm({ onSuccess, onCancel }: AddMaintenanceFormProps) {
  const [trucks, setTrucks] = useState<
    { id: string; registration: string; make: string; model: string }[]
  >([])
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
    name: 'spare_parts',
  })

  // Fetch trucks on mount
  useEffect(() => {
    async function fetchTrucks() {
      try {
        setIsLoading(true)
        const res = await fetch('/api/trucks')
        if (res.ok) {
          const data = await res.json()
          setTrucks(data.trucks || [])
        } else {
          toast.error('Failed to load trucks')
        }
      } catch {
        toast.error('Failed to load trucks')
      } finally {
        setIsLoading(false)
      }
    }
    fetchTrucks()
  }, [])

  const serviceDate = watch('service_date')
  const nextServiceDate = watch('next_service_due')
  const serviceType = watch('service_type')
  const spareParts = watch('spare_parts') || []

  const totalPartsCost = spareParts.reduce((sum, part) => sum + (part?.total_price || 0), 0)

  const addSparePart = () =>
    append({
      name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload only JPEG or PDF files')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }
    setUploadedFile(file)
    setValue('receipt_file', file)
  }

  const onSubmit = async (data: MaintenanceFormData) => {
    console.log('[DEBUG] Submitting maintenance form data:', data)
    setIsSubmitting(true)
    
    try {
      if (data.service_type === 'MAINTENANCE' && !data.route_taken) {
        toast.error('Route is required for maintenance activities')
        setIsSubmitting(false)
        return
      }

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
        receiptUrl: '', // Adjust if you handle uploading receipt files server-side
        spareParts: spareParts
          .filter((p) => p.name && p.quantity > 0)
          .map((p) => ({
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.unit_price,
            totalPrice: p.total_price,
          })),
      }

      const resp = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceData),
      })

      if (resp.ok) {
        toast.success('Maintenance record created successfully!')
        console.log('[DEBUG] Form submission successful, calling onSuccess and onCancel')
        onSuccess() // tell parent to refresh list
        onCancel() // close this form
      } else {
        const err = await resp.json()
        toast.error(err.error || 'Failed to create maintenance record')
      }
    } catch (err) {
      toast.error('Failed to create maintenance record')
      console.error('Form submission error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <p>Loading trucks...</p>
  }

  const kenyanRoutes = [
    { value: 'Nairobi-Mombasa', label: 'Nairobi — Mombasa' },
    { value: 'Nairobi-Kisumu', label: 'Nairobi — Kisumu' },
    { value: 'Nairobi-Eldoret', label: 'Nairobi — Eldoret' },
    { value: 'Mombasa-Malaba', label: 'Mombasa — Malaba' },
    { value: 'Nairobi-Nakuru', label: 'Nairobi — Nakuru' },
    { value: 'Other', label: 'Other Route' },
  ]

  return (
    <Card className="w-full max-w-3xl mx-auto max-h-[90vh] flex flex-col">
      <CardHeader className="flex-none">
        <CardTitle>Add Maintenance Record</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pb-6 px-1">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Truck Selection */}
          <div>
            <Label htmlFor="truck_id">Truck *</Label>
            <Select onValueChange={(value) => setValue('truck_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select truck" />
              </SelectTrigger>
              <SelectContent>
                {trucks.map((truck) => (
                  <SelectItem key={truck.id} value={truck.id}>
                    {truck.registration} — {truck.make} {truck.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.truck_id && <p className="text-xs text-red-600">{errors.truck_id.message}</p>}
          </div>

          {/* Service Date */}
          <div>
            <Label>Service Date *</Label>
            <Popover open={serviceDateOpen} onOpenChange={setServiceDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !serviceDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {serviceDate ? format(serviceDate, 'PPP') : 'Pick a date'}
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
              <p className="text-xs text-red-600">{errors.service_date.message}</p>
            )}
          </div>

          {/* Service Type */}
          <div>
            <Label>Service Type *</Label>
            <Select onValueChange={(value) => setValue('service_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAINTENANCE">Maintenance (Route Required)</SelectItem>
                <SelectItem value="SERVICE">Service (General)</SelectItem>
              </SelectContent>
            </Select>
            {errors.service_type && (
              <p className="text-xs text-red-600">{errors.service_type.message}</p>
            )}
          </div>

          {/* Maintenance Category */}
          <div>
            <Label>Category *</Label>
            <Select onValueChange={(value) => setValue('maintenance_category', value)}>
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
              <p className="text-xs text-red-600">{errors.maintenance_category.message}</p>
            )}
          </div>

          {/* Route Taken, required only if service_type==="MAINTENANCE" */}
          {serviceType === 'MAINTENANCE' && (
            <div>
              <Label>Route Taken *</Label>
              <Select onValueChange={(value) => setValue('route_taken', value)}>
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
              <p className="text-xs text-red-600">⚠️ Route is mandatory for maintenance activities</p>
            </div>
          )}

          {/* Description */}
          <div>
            <Label>Description *</Label>
            <Textarea
              {...register('description')}
              placeholder="Describe the service performed..."
              className="min-h-[60px]"
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Spare Parts Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label>Parts & Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSparePart} className="h-8">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-xs italic text-muted-foreground">No spare parts added yet</p>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="p-2 border rounded space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">Part {index + 1}</span>
                  <Button
                    onClick={() => remove(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Name</Label>
                    <Input {...register(`spare_parts.${index}.name`)} placeholder="Name" size="sm" />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      {...register(`spare_parts.${index}.quantity`, { valueAsNumber: true })}
                      type="number"
                      min="1"
                      placeholder="1"
                      size="sm"
                      onChange={(e) => {
                        const quantity = parseInt(e.target.value) || 1
                        const unitPrice = spareParts[index]?.unit_price || 0
                        setValue(`spare_parts.${index}.total_price`, quantity * unitPrice)
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Unit Price (KSh)</Label>
                    <Input
                      {...register(`spare_parts.${index}.unit_price`, { valueAsNumber: true })}
                      type="number"
                      min="0"
                      placeholder="0"
                      size="sm"
                      onChange={(e) => {
                        const unitPrice = parseFloat(e.target.value) || 0
                        const quantity = spareParts[index]?.quantity || 1
                        setValue(`spare_parts.${index}.total_price`, unitPrice * quantity)
                      }}
                    />
                  </div>
                  <div>
                    <Label>Total (KSh)</Label>
                    <Input
                      {...register(`spare_parts.${index}.total_price`, { valueAsNumber: true })}
                      readOnly
                      className="bg-muted"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            <p className="text-right text-sm font-medium">
              Total Parts Cost: KSh {totalPartsCost.toLocaleString()}
            </p>
          </div>

          {/* Labor Cost */}
          <div>
            <Label>Labor Cost (KSh)</Label>
            <Input
              {...register('labor_cost', { valueAsNumber: true })}
              type="number"
              min="0"
              step="0.01"
              size="sm"
            />
            {errors.labor_cost && <p className="text-xs text-red-600">{errors.labor_cost.message}</p>}
          </div>

          {/* Vendor Name and Location */}
          <div>
            <Label>Vendor / Service Provider *</Label>
            <Input
              {...register('vendor_name')}
              placeholder="Name of vendor/service provider"
              size="sm"
            />
            {errors.vendor_name && <p className="text-xs text-red-600">{errors.vendor_name.message}</p>}
          </div>
          <div>
            <Label>Vendor Location (Optional)</Label>
            <Input {...register('vendor_location')} placeholder="Vendor location" size="sm" />
          </div>

          <p className="text-right text-sm font-medium">
            Total Cost: KSh {(watch('labor_cost') + totalPartsCost).toLocaleString()}
          </p>

          {/* Receipt Upload */}
          <div>
            <Label>Receipt Upload (Optional)</Label>
            <input
              type="file"
              id="receipt_file"
              accept="image/jpeg,image/jpg,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="receipt_file"
              className="flex items-center gap-2 px-3 py-1.5 border rounded cursor-pointer text-muted-foreground hover:text-foreground text-sm"
            >
              <Upload className="h-4 w-4" />
              <span>{uploadedFile ? `✔ ${uploadedFile.name}` : 'Upload receipt (JPEG/PDF, max 5MB)'}</span>
            </label>
            <p className="text-xs italic text-muted-foreground">
              Upload a copy of the receipt for purchased parts (optional)
            </p>
          </div>

          {/* Mileage and Technician */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Mileage at Service (km)</Label>
              <Input
                {...register('mileage_at_service', { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="Current mileage"
                size="sm"
              />
            </div>
            <div>
              <Label>Technician (Optional)</Label>
              <Input {...register('technician_name')} placeholder="Technician name" size="sm" />
            </div>
          </div>

          {/* Next Service Due */}
          <div>
            <Label>Next Service Due (Optional)</Label>
            <Popover open={nextServiceOpen} onOpenChange={setNextServiceOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !nextServiceDate && 'text-muted-foreground'
                  )}
                  size="sm"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextServiceDate ? format(nextServiceDate, 'PPP') : 'Pick next service date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={nextServiceDate}
                  onSelect={(date) => {
                    setValue('next_service_due', date!)
                    setNextServiceOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Form Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t mt-5 sticky bottom-0 bg-white z-10">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} size="sm">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} size="sm">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Record'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
