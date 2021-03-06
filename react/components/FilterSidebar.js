import classNames from 'classnames'
import produce from 'immer'
import React, { useState, useEffect, useMemo, Fragment } from 'react'
import { FormattedMessage } from 'react-intl'
import { ExtensionPoint } from 'vtex.render-runtime'
import { Button } from 'vtex.styleguide'
import { IconFilter } from 'vtex.store-icons'
import { useCssHandles } from 'vtex.css-handles'

import FilterNavigatorContext, {
  useFilterNavigator,
} from './FilterNavigatorContext'
import AccordionFilterContainer from './AccordionFilterContainer'
import Sidebar from './SideBar'
import { buildNewQueryMap } from '../hooks/useFacetNavigation'

import styles from '../searchResult.css'

const CSS_HANDLES = [
  'filterPopupButton',
  'filterPopupTitle',
  'filterButtonsBox',
  'filterPopupArrowIcon',
  'filterClearButtonWrapper',
  'filterApplyButtonWrapper',
]

const FilterSidebar = ({
  selectedFilters,
  filters,
  tree,
  priceRange,
  preventRouteChange,
  navigateToFacet,
}) => {
  const filterContext = useFilterNavigator()
  const [open, setOpen] = useState(false)
  const handles = useCssHandles(CSS_HANDLES)

  const [filterOperations, setFilterOperations] = useState([])
  const [categoryTreeOperations, setCategoryTreeOperations] = useState([])
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const currentTree = useCategoryTree(tree, categoryTreeOperations)

  const isFilterSelected = (filters, filter) => {
    return filters.find(
      filterOperation =>
        filter.value === filterOperation.value && filter.map === filter.map
    )
  }

  const handleFilterCheck = filter => {
    if (!isFilterSelected(filterOperations, filter)) {
      setFilterOperations(filterOperations.concat(filter))
    } else {
      setFilterOperations(
        filterOperations.filter(facet => facet.value !== filter.value)
      )
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleOpen = () => {
    setOpen(true)
  }

  const handleApply = () => {
    navigateToFacet(filterOperations, preventRouteChange)
    setOpen(false)
    setFilterOperations([])
  }

  const handleClearFilters = () => {
    setFilterOperations([])
    setOpen(false)
  }

  const handleUpdateCategories = maybeCategories => {
    const categories = Array.isArray(maybeCategories)
      ? maybeCategories
      : [maybeCategories]

    const categoriesSelected = filterOperations.filter(op => op.map === 'c')
    const newCategories = [...categoriesSelected, ...categories]

    // Just save the newest operation here to be recorded at the category tree hook and update the tree
    setCategoryTreeOperations(categories)

    // Save all filters along with the new categories, appended to the old ones
    setFilterOperations(filters => {
      return filters
        .filter(operations => operations.map !== 'c')
        .concat(newCategories)
    })
  }

  const context = useMemo(() => {
    const { query, map } = filterContext
    return {
      ...filterContext,
      ...buildNewQueryMap(query, map, filterOperations, selectedFilters),
    }
  }, [filterOperations, filterContext, selectedFilters])

  return (
    <Fragment>
      <button
        className={classNames(
          `${styles.filterPopupButton} ph3 pv5 mv0 mv0 pointer flex justify-center items-center`,
          {
            'bb b--muted-1': open,
            bn: !open,
          }
        )}
        onClick={handleOpen}
      >
        <span
          className={`${handles.filterPopupTitle} c-on-base t-action--small ml-auto`}
        >
          <FormattedMessage id="store/search-result.filter-action.title" />
        </span>
        <span className={`${handles.filterPopupArrowIcon} ml-auto pl3 pt2`}>
          <IconFilter size={16} viewBox="0 0 17 17" />
        </span>
      </button>

      <Sidebar onOutsideClick={handleClose} isOpen={open}>
        <FilterNavigatorContext.Provider value={context}>
          <AccordionFilterContainer
            filters={filters}
            tree={currentTree}
            onFilterCheck={handleFilterCheck}
            onCategorySelect={handleUpdateCategories}
            priceRange={priceRange}
          />
          <ExtensionPoint id="sidebar-close-button" onClose={handleClose} />
        </FilterNavigatorContext.Provider>
        <div
          className={`${styles.filterButtonsBox} bt b--muted-5 bottom-0 fixed w-100 items-center flex z-1 bg-base`}
        >
          <div
            className={`${handles.filterClearButtonWrapper} bottom-0 fl w-50 pl4 pr2`}
          >
            <Button
              block
              variation="tertiary"
              size="regular"
              onClick={handleClearFilters}
            >
              <FormattedMessage id="store/search-result.filter-button.clear" />
            </Button>
          </div>
          <div
            className={`${handles.filterApplyButtonWrapper} bottom-0 fr w-50 pr4 pl2`}
          >
            <Button
              block
              variation="secondary"
              size="regular"
              onClick={handleApply}
            >
              <FormattedMessage id="store/search-result.filter-button.apply" />
            </Button>
          </div>
        </div>
      </Sidebar>
    </Fragment>
  )
}

const updateTree = categories =>
  produce(draft => {
    if (!categories.length) {
      return
    }

    let currentLevel = draft

    while (
      !(
        currentLevel.find(category => category.value === categories[0].value) ||
        currentLevel.every(category => !category.selected)
      )
    ) {
      currentLevel = currentLevel.find(category => category.selected).children
    }

    categories.forEach(category => {
      let selectedIndex = currentLevel.findIndex(
        cat => cat.value === category.value
      )

      currentLevel[selectedIndex].selected = !currentLevel[selectedIndex]
        .selected
      currentLevel = currentLevel[selectedIndex].children
    })
  })

// in order for us to avoid sending a request to the facets
// API and refetch all filters on every category change (like
// we are doing on desktop), we'll keep a local copy of the category
// tree structure, and locally modify it with the information we
// have.
//
// the component responsible for displaying the category tree
// in a user-friendly manner should reflect to the changes
// we make in the tree, the same as it would with a tree fetched
// from the API.
const useCategoryTree = (initialTree, categoryTreeOperations) => {
  const [tree, setTree] = useState(initialTree)

  useEffect(() => {
    setTree(initialTree)
  }, [initialTree])

  useEffect(() => {
    setTree(updateTree(categoryTreeOperations))
  }, [categoryTreeOperations, initialTree])

  return tree
}

export default FilterSidebar
