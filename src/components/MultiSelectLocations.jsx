
import React from 'react';
import Select, { components } from 'react-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

const Option = (props) => {
  return (
    <components.Option {...props}>
      <div className="flex items-center">
        <Checkbox
          id={`loc-opt-${props.value}`}
          checked={props.isSelected}
          onCheckedChange={() => null} 
          className="mr-2 border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <Label htmlFor={`loc-opt-${props.value}`} className="text-sm font-normal text-popover-foreground cursor-pointer">
          {props.label}
        </Label>
      </div>
    </components.Option>
  );
};

const MultiValueRemove = (props) => {
  return (
    <components.MultiValueRemove {...props}>
      <X size={14} />
    </components.MultiValueRemove>
  );
};

const CustomClearIndicator = (props) => {
  const {
    children = <X size={18} />,
    getStyles,
    innerProps: { ref, ...restInnerProps },
  } = props;
  return (
    <div
      {...restInnerProps}
      ref={ref}
      style={getStyles('clearIndicator', props)}
      className="p-1 cursor-pointer hover:bg-destructive/20 rounded-full"
    >
      {children}
    </div>
  );
};

const MultiSelectLocations = ({ id, placeholder, value, onChange, options, className, disabled }) => {
  
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'hsl(var(--input))',
      borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--border))',
      boxShadow: state.isFocused ? `0 0 0 1px hsl(var(--ring))` : 'none',
      '&:hover': {
        borderColor: 'hsl(var(--ring))',
      },
      minHeight: '40px',
      borderRadius: 'var(--radius)',
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '2px 8px',
    }),
    input: (provided) => ({
      ...provided,
      color: 'hsl(var(--foreground))',
      margin: '0px',
      padding: '0px',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: 'hsl(var(--primary) / 0.8)',
      borderRadius: 'calc(var(--radius) - 4px)',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: 'hsl(var(--primary-foreground))',
      fontSize: '0.875rem',
      paddingLeft: '6px',
      paddingRight: '2px',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: 'hsl(var(--primary-foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
      },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 'var(--radius)',
      zIndex: 50,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'hsl(var(--primary))' : state.isFocused ? 'hsl(var(--accent) / 0.2)' : 'hsl(var(--popover))',
      color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--popover-foreground))',
      '&:active': {
        backgroundColor: 'hsl(var(--primary) / 0.8)',
      },
      cursor: 'pointer',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: 'hsl(var(--border))',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
      '&:hover': {
        color: 'hsl(var(--foreground))',
      },
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
       '&:hover': {
        color: 'hsl(var(--destructive))',
      },
    }),
  };

  return (
    <Select
      inputId={id}
      value={value}
      onChange={onChange}
      options={options}
      isMulti
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      components={{ Option, MultiValueRemove, ClearIndicator: CustomClearIndicator }}
      placeholder={placeholder}
      className={className}
      isDisabled={disabled}
      styles={customStyles}
      noOptionsMessage={() => "Nenhuma opção encontrada"}
      classNamePrefix="multi-select"
    />
  );
};

export default MultiSelectLocations;
