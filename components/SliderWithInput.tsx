'use client';
import { useState } from 'react';
import { Input } from './ui/input';
import { Slider } from './ui/slider';

export default function SliderWithInput({
  min,
  max,
  step,
  id,
  defaultValue,
}: {
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  defaultValue: number;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className='flex items-center space-x-2 text-xs'>
      <Slider min={min} max={max} step={step} id={id} name={id} value={[value]} onValueChange={e => setValue(e[0])} />
      <Input
        type='number'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        className='w-16'
      />
    </div>
  );
}
