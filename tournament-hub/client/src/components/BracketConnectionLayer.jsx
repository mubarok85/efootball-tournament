import { useEffect, useRef, useState } from 'react'

function BracketConnectionLayer({ matches }) {
  const svgRef = useRef(null)
  const [paths, setPaths] = useState([])

  useEffect(() => {
    const svg = svgRef.current
    const canvas = svg?.parentElement


    function rebuild() {
      const box = canvas.getBoundingClientRect()
      const nodes = [...canvas.querySelectorAll("[data-bracket-tie-id]")]
      const tieMap = new Map(nodes.map((node) => [node.dataset.bracketTieId, node]))
      const nextPaths = []
      nodes.forEach((source) => {
        const target = tieMap.get(source.dataset.nextTieId)
        if (!target) return
        const a = source.getBoundingClientRect()
        const b = target.getBoundingClientRect()
        const right = b.left + b.width / 2 >= a.left + a.width / 2
        const x1 = (right ? a.right : a.left) - box.left
        const x2 = (right ? b.left : b.right) - box.left
        const y1 = a.top - box.top + a.height / 2
        const y2 = b.top - box.top + b.height / 2
        const mid = (x1 + x2) / 2
        nextPaths.push({ id: source.dataset.bracketTieId + "-" + source.dataset.nextTieId, d: "M " + x1 + " " + y1 + " H " + mid + " V " + y2 + " H " + x2 })
      })
      svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height)
      setPaths(nextPaths)
    }

    rebuild()
    window.addEventListener('resize', rebuild)

    return () => {
      window.removeEventListener('resize', rebuild)
    }
  }, [matches])

  return (
    <svg
      ref={svgRef}
      className="premium-bracket-connectors"
      aria-hidden="true"
    >
      {paths.map((path) => (
        <path key={path.id} d={path.d} />
      ))}
    </svg>
  )
}

export default BracketConnectionLayer

