import { useEffect, useRef, useCallback } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import './ListView.css'

function ListView({ 
  items, 
  onItemClick, 
  selectedIndex: propSelectedIndex,
  onLoadMore,
  hasMore = false,
  loading = false
}) {
  const { selectedIndex: storeSelectedIndex } = useNavigationStore()
  const listRef = useRef(null)
  const loadingRef = useRef(false)
  
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

  // Infinite scroll detection
  const handleScroll = useCallback(() => {
    if (!listRef.current || !onLoadMore || !hasMore || loading || loadingRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    const scrollBottom = scrollTop + clientHeight
    const threshold = scrollHeight - 100 // Load more when within 100px of bottom

    if (scrollBottom >= threshold) {
      loadingRef.current = true
      onLoadMore().finally(() => {
        loadingRef.current = false
      })
    }
  }, [onLoadMore, hasMore, loading])

  // Add scroll listener
  useEffect(() => {
    const listElement = listRef.current
    if (listElement && onLoadMore) {
      listElement.addEventListener('scroll', handleScroll)
      return () => listElement.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll, onLoadMore])
  
  return (
    <div className="list-view-container">
      <ul className="ipod-list" ref={listRef}>
        {items.map((item, index) => (
          <li
            key={item.id || index}
            className={`list-item ${selectedIndex === index ? 'selected' : ''}`}
            onClick={() => onItemClick && onItemClick(item, index)}
            data-index={index}
          >
            <div className="item-content">
              <span className="item-text">{item.title || item.name}</span>
              {item.subtitle && <span className="item-subtitle">{item.subtitle}</span>}
            </div>
            {item.showArrow !== false && <span className="item-arrow">›</span>}
            {item.value && <span className="item-value">{item.value}</span>}
          </li>
        ))}
        {loading && (
          <li className="list-item loading">
            <div className="item-content">
              <span className="item-text">Loading...</span>
            </div>
          </li>
        )}
      </ul>
    </div>
  )
}

export default ListView
