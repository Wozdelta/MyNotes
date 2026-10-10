import React, {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

type NativeSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size'>;

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
}

function optionText(children: React.ReactNode): string {
  return Children.toArray(children)
    .map(child => typeof child === 'string' || typeof child === 'number' ? String(child) : '')
    .join('');
}

function readOptions(children: React.ReactNode): SelectOption[] {
  const result: SelectOption[] = [];
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === 'option') {
      const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
      result.push({
        value: String(props.value ?? optionText(props.children)),
        label: optionText(props.children),
        disabled: Boolean(props.disabled)
      });
      return;
    }
    if (child.type === 'optgroup') {
      readOptions((child.props as React.OptgroupHTMLAttributes<HTMLOptGroupElement>).children)
        .forEach(option => result.push(option));
    }
  });
  return result;
}

export const Select: React.FC<NativeSelectProps> = ({
  children,
  className = '',
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  id,
  name,
  style,
  'aria-label': ariaLabel,
  ...selectProps
}) => {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => readOptions(children), [children]);
  const controlledValue = value === undefined ? undefined : String(value);
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? options[0]?.value ?? ''));
  const selectedValue = controlledValue ?? internalValue;
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === selectedValue));
  const selected = options[selectedIndex];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const positionMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const longestLabel = options.reduce((length, option) => Math.max(length, option.label.length), 0);
    const desiredWidth = Math.min(
      window.innerWidth - 16,
      Math.max(rect.width, Math.min(340, longestLabel * 8.2 + 54))
    );
    const availableBelow = window.innerHeight - rect.bottom - 10;
    const menuHeight = Math.min(280, Math.max(44, options.length * 42 + 10));
    const openAbove = availableBelow < Math.min(menuHeight, 180) && rect.top > availableBelow;
    setMenuStyle({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - desiredWidth - 8)),
      top: openAbove ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
      width: desiredWidth,
      maxHeight: openAbove ? Math.min(280, rect.top - 14) : Math.min(280, availableBelow)
    });
  };

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex);
    positionMenu();
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const handleLayout = () => positionMenu();
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleLayout);
    window.addEventListener('scroll', handleLayout, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleLayout);
      window.removeEventListener('scroll', handleLayout, true);
    };
  }, [open, selectedIndex, options.length]);

  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    if (controlledValue === undefined) setInternalValue(option.value);
    onChange?.({
      target: { value: option.value, name },
      currentTarget: { value: option.value, name }
    } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const move = (direction: 1 | -1) => {
    if (!options.length) return;
    let next = activeIndex;
    do next = (next + direction + options.length) % options.length;
    while (options[next]?.disabled && next !== activeIndex);
    setActiveIndex(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      else move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open && options[activeIndex]) choose(options[activeIndex]);
      else setOpen(true);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(options.findIndex(option => !option.disabled));
    } else if (event.key === 'End' && open) {
      event.preventDefault();
      let lastEnabled = options.length - 1;
      while (lastEnabled >= 0 && options[lastEnabled]?.disabled) lastEnabled--;
      setActiveIndex(lastEnabled);
    }
  };

  const wrapperClassName = className.replace(/\bform-select\b/g, '').trim();
  const {
    flex,
    width,
    minWidth,
    maxWidth,
    alignSelf,
    ...triggerStyle
  } = style || {};
  const wrapperStyle: React.CSSProperties = { flex, width, minWidth, maxWidth, alignSelf };

  return <div className={`custom-select ${wrapperClassName}`} style={wrapperStyle}>
    <select
      {...selectProps}
      id={id}
      name={name}
      value={selectedValue}
      onChange={onChange}
      disabled={disabled}
      required={false}
      aria-hidden="true"
      tabIndex={-1}
      className="custom-select-native"
    >{children}</select>
    <button
      ref={triggerRef}
      type="button"
      className="custom-select-trigger"
      style={triggerStyle}
      disabled={disabled}
      role="combobox"
      aria-label={ariaLabel}
      aria-controls={listboxId}
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-required={required}
      onClick={() => setOpen(current => !current)}
      onKeyDown={handleKeyDown}
    >
      <span>{selected?.label || 'Selecione...'}</span>
      <ChevronDown size={17} aria-hidden="true" />
    </button>
    {open && createPortal(
      <div ref={menuRef} id={listboxId} className="custom-select-menu" role="listbox" style={menuStyle} aria-label={ariaLabel}>
        {options.map((option, index) => <button
          type="button"
          role="option"
          aria-selected={option.value === selectedValue}
          className={index === activeIndex ? 'is-active' : ''}
          disabled={option.disabled}
          key={`${option.value}-${index}`}
          onPointerEnter={() => setActiveIndex(index)}
          onClick={() => choose(option)}
        >
          <span>{option.label}</span>
          {option.value === selectedValue && <Check size={16} aria-hidden="true" />}
        </button>)}
      </div>, document.body
    )}
  </div>;
};
