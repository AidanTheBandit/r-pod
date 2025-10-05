import { useEffect, useRef } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import './ListView.css'

function ListView({ items, onItemClick, selectedIndex: propSelectedIndex }) {
  const { selectedIndex: storeSelectedIndex } = useNavigationStore()
  const listRef = useRef(null)
  
  // Use prop if provided, otherwise use store
  const selectedIndex = propSelectedIndex !== undefined ? propSelectedIndex : storeSelectedIndex
  
  // Scroll to selected item
  useEffect(() => {
    if (!listRef.current) return
    
    const selectedItem = listRef.current.querySelector('.list-item.selected')
    if (selectedItem) {
      selectedItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedIndex])
  
  return (
    <ul className="ipod-list" ref={listRef}>
      {items.map((item, index) => (
        <li
          key={item.id || index}
          className={`list-item ${selectedIndex === index ? 'selected' : ''}`}
          onClick={() => onItemClick && onItemClick(item, index)}
          data-index={index}
        >
          {item.icon && <span className="item-icon">{item.icon}</span>}
          <div className="item-content">
            <span className="item-text">{item.title || item.name}</span>
            {item.subtitle && <span className="item-subtitle">{item.subtitle}</span>}
          </div>
          {item.showArrow !== false && <span className="item-arrow">›</span>}
          {item.value && <span className="item-value">{item.value}</span>}
        </li>
      ))}
    </ul>
  )
}

export default ListView
