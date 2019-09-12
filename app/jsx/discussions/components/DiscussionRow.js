/*
 * Copyright (C) 2018 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import I18n from 'i18n!discussion_row'

import React, {Component} from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import {DragSource, DropTarget} from 'react-dnd'
import {findDOMNode} from 'react-dom'
import {func, bool, string, arrayOf} from 'prop-types'
import cx from 'classnames'

import $ from 'jquery'
import 'jquery.instructure_date_and_time'

import {Badge, Heading, Pill, Text} from '@instructure/ui-elements'
import {View, Grid} from '@instructure/ui-layout'
import {
  IconAssignmentLine,
  IconBookmarkLine,
  IconBookmarkSolid,
  IconCopySolid,
  IconDragHandleLine,
  IconDuplicateLine,
  IconLockLine,
  IconLtiLine,
  IconPeerReviewLine,
  IconPinLine,
  IconPinSolid,
  IconPublishSolid,
  IconTrashSolid,
  IconUnlockLine,
  IconUnpublishedLine,
  IconUpdownLine,
  IconUserLine
} from '@instructure/ui-icons'
import {ScreenReaderContent} from '@instructure/ui-a11y'
import {Menu} from '@instructure/ui-menu'

import DiscussionModel from 'compiled/models/DiscussionTopic'
import LockIconView from 'compiled/views/LockIconView'

import actions from '../actions'
import compose from '../../shared/helpers/compose'
import CyoeHelper from '../../shared/conditional_release/CyoeHelper'
import DiscussionManageMenu from '../../shared/components/DiscussionManageMenu'
import discussionShape from '../../shared/proptypes/discussion'
import masterCourseDataShape from '../../shared/proptypes/masterCourseData'
import propTypes from '../propTypes'
import SectionsTooltip from '../../shared/SectionsTooltip'
import select from '../../shared/select'
import ToggleIcon from '../../shared/components/ToggleIcon'
import UnreadBadge from '../../shared/components/UnreadBadge'
import {isPassedDelayedPostAt} from '../../shared/date-utils'

const dragTarget = {
  beginDrag(props) {
    return props.discussion
  }
}

const dropTarget = {
  hover(props, monitor, component) {
    const dragIndex = props.getDiscussionPosition(monitor.getItem())
    const hoverIndex = props.getDiscussionPosition(props.discussion)
    if (dragIndex === undefined || hoverIndex === undefined) {
      return
    }
    if (dragIndex === hoverIndex) {
      return
    }
    const hoverBoundingRect = findDOMNode(component).getBoundingClientRect()
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
    const clientOffset = monitor.getClientOffset()
    const hoverClientY = clientOffset.y - hoverBoundingRect.top

    // Only perform the move when the mouse has crossed half of the items height
    // When dragging downwards, only move when the cursor is below 50%
    // When dragging upwards, only move when the cursor is above 50%
    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return
    }
    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return
    }
    props.moveCard(dragIndex, hoverIndex)
  }
}

export class DiscussionRow extends Component {
  static propTypes = {
    canPublish: bool.isRequired,
    cleanDiscussionFocus: func.isRequired,
    connectDragPreview: func,
    connectDragSource: func,
    connectDropTarget: func,
    contextType: string.isRequired,
    deleteDiscussion: func.isRequired,
    setCopyTo: func.isRequired,
    setSendToOpen: func.isRequired,
    discussion: discussionShape.isRequired,
    discussionTopicMenuTools: arrayOf(propTypes.discussionTopicMenuTools),
    displayDeleteMenuItem: bool.isRequired,
    displayDuplicateMenuItem: bool.isRequired,
    displayLockMenuItem: bool.isRequired,
    displayMasteryPathsMenuItem: bool,
    displayMasteryPathsLink: bool,
    displayMasteryPathsPill: bool,
    masteryPathsPillLabel: string, // required if displayMasteryPathsPill is true
    displayManageMenu: bool.isRequired,
    displayPinMenuItem: bool.isRequired,
    draggable: bool,
    duplicateDiscussion: func.isRequired,
    isDragging: bool,
    isMasterCourse: bool.isRequired,
    masterCourseData: masterCourseDataShape,
    moveCard: func,
    onMoveDiscussion: func,
    toggleSubscriptionState: func.isRequired,
    updateDiscussion: func.isRequired,
    DIRECT_SHARE_ENABLED: bool.isRequired
  }

  static defaultProps = {
    connectDragPreview(component) {
      return component
    },
    connectDragSource(component) {
      return component
    },
    connectDropTarget(component) {
      return component
    },
    discussionTopicMenuTools: [],
    draggable: false,
    isDragging: false,
    masterCourseData: null,
    displayMasteryPathsMenuItem: false,
    displayMasteryPathsLink: false,
    displayMasteryPathsPill: false,
    masteryPathsPillLabel: '',
    moveCard: () => {},
    onMoveDiscussion: null
  }

  componentDidMount = () => {
    this.onFocusManage(this.props)
  }

  componentWillReceiveProps = nextProps => {
    this.onFocusManage(nextProps)
  }

  // TODO: Move this to a common file so announcements can use this also.
  onFocusManage = props => {
    if (props.discussion.focusOn) {
      switch (props.discussion.focusOn) {
        case 'title':
          this._titleElement.focus()
          break
        case 'manageMenu':
          this._manageMenu.focus()
          break
        case 'toggleButton':
          break
        default:
          throw new Error(I18n.t('Illegal element focus request'))
      }
      this.props.cleanDiscussionFocus()
    }
  }

  onManageDiscussion = (e, {action, id, menuTool}) => {
    switch (action) {
      case 'duplicate':
        this.props.duplicateDiscussion(id)
        break
      case 'moveTo':
        this.props.onMoveDiscussion({id, title: this.props.discussion.title})
        break
      case 'togglepinned':
        this.props.updateDiscussion(
          this.props.discussion,
          {pinned: !this.props.discussion.pinned},
          this.makePinSuccessFailMessages(this.props.discussion),
          'manageMenu'
        )
        break
      case 'delete':
        this.props.deleteDiscussion(this.props.discussion)
        break
      case 'togglelocked':
        this.props.updateDiscussion(
          this.props.discussion,
          {locked: !this.props.discussion.locked},
          this.makeLockedSuccessFailMessages(this.props.discussion),
          'manageMenu'
        )
        break
      case 'copyTo':
        this.props.setCopyTo({
          open: true,
          selection: {discussion_topics: [this.props.discussion.id]}
        })
        break
      case 'sendTo':
        this.props.setSendToOpen(true)
        break

      case 'masterypaths':
        window.location = `discussion_topics/${
          this.props.discussion.id
        }/edit?return_to=${encodeURIComponent(window.location.pathname)}#mastery-paths-editor`
        break
      case 'ltiMenuTool':
        window.location = `${menuTool.base_url}&discussion_topics[]=${id}`
        break
      default:
        throw new Error(I18n.t('Unknown manage discussion action encountered'))
    }
  }

  getAccessibleTitle() {
    let result = `${this.props.discussion.title} `
    const availability = this.getAvailabilityString()
    if (availability) result += `${availability} `
    const assignment = this.props.discussion.assignment
    const dueDateString =
      assignment && assignment.due_at
        ? I18n.t('Due %{date} ', {date: $.datetimeString(assignment.due_at)})
        : ' '
    result += dueDateString
    const lastReplyAtDate = $.datetimeString(this.props.discussion.last_reply_at)
    if (lastReplyAtDate.length > 0 && this.props.discussion.discussion_subentry_count > 0) {
      result += I18n.t('Last post at %{date}', {date: lastReplyAtDate})
    }
    return result
  }

  getAvailabilityString = () => {
    const assignment = this.props.discussion.assignment

    const availabilityBegin =
      this.props.discussion.delayed_post_at || (assignment && assignment.unlock_at)
    const availabilityEnd = this.props.discussion.lock_at || (assignment && assignment.lock_at)

    if (
      availabilityBegin &&
      !isPassedDelayedPostAt({checkDate: null, delayedDate: availabilityBegin})
    ) {
      return I18n.t('Not available until %{date}', {date: $.datetimeString(availabilityBegin)})
    }
    if (availabilityEnd) {
      if (isPassedDelayedPostAt({checkDate: null, delayedDate: availabilityEnd})) {
        return I18n.t('Was locked at %{date}', {date: $.datetimeString(availabilityEnd)})
      } else {
        return I18n.t('Available until %{date}', {date: $.datetimeString(availabilityEnd)})
      }
    }
    return ''
  }

  makePinSuccessFailMessages = () => {
    const successMessage = this.props.discussion.pinned
      ? I18n.t('Unpin of discussion %{title} succeeded', {title: this.props.discussion.title})
      : I18n.t('Pin of discussion %{title} succeeded', {title: this.props.discussion.title})
    const failMessage = this.props.discussion.pinned
      ? I18n.t('Unpin of discussion %{title} failed', {title: this.props.discussion.title})
      : I18n.t('Pin of discussion %{title} failed', {title: this.props.discussion.title})
    return {successMessage, failMessage}
  }

  makeLockedSuccessFailMessages = () => {
    const successMessage = this.props.discussion.locked
      ? I18n.t('Unlock discussion %{title} succeeded', {title: this.props.discussion.title})
      : I18n.t('Lock discussion %{title} succeeded', {title: this.props.discussion.title})
    const failMessage = this.props.discussion.locked
      ? I18n.t('Unlock discussion %{title} failed', {title: this.props.discussion.title})
      : I18n.t('Lock discussion %{title} failed', {title: this.props.discussion.title})
    return {successMessage, failMessage}
  }

  readCount = () => {
    const readCount =
      this.props.discussion.discussion_subentry_count > 0 ? (
        <UnreadBadge
          key={`Badge_${this.props.discussion.id}`}
          unreadCount={this.props.discussion.unread_count}
          unreadLabel={I18n.t('%{count} unread replies', {
            count: this.props.discussion.unread_count
          })}
          totalCount={this.props.discussion.discussion_subentry_count}
          totalLabel={I18n.t('%{count} replies', {
            count: this.props.discussion.discussion_subentry_count
          })}
        />
      ) : null
    return readCount
  }

  initializeMasterCourseIcon = container => {
    const masterCourse = {
      courseData: this.props.masterCourseData || {},
      getLockOptions: () => ({
        model: new DiscussionModel(this.props.discussion),
        unlockedText: I18n.t('%{title} is unlocked. Click to lock.', {
          title: this.props.discussion.title
        }),
        lockedText: I18n.t('%{title} is locked. Click to unlock', {
          title: this.props.discussion.title
        }),
        course_id: this.props.masterCourseData.masterCourse.id,
        content_id: this.props.discussion.id,
        content_type: 'discussion_topic'
      })
    }
    const {courseData = {}, getLockOptions} = masterCourse || {}
    if (container && (courseData.isMasterCourse || courseData.isChildCourse)) {
      this.unmountMasterCourseLock()
      const opts = getLockOptions()

      // initialize master course lock icon, which is a Backbone view
      // I know, I know, backbone in react is grosssss but wachagunnado
      this.masterCourseLock = new LockIconView({...opts, el: container})
      this.masterCourseLock.render()
    }
  }

  subscribeButton = () => (
    <ToggleIcon
      key={`Subscribe_${this.props.discussion.id}`}
      toggled={this.props.discussion.subscribed}
      OnIcon={
        <Text color="success">
          <IconBookmarkSolid
            title={I18n.t('Unsubscribe from %{title}', {title: this.props.discussion.title})}
          />
        </Text>
      }
      OffIcon={
        <Text color="brand">
          <IconBookmarkLine
            title={I18n.t('Subscribe to %{title}', {title: this.props.discussion.title})}
          />
        </Text>
      }
      onToggleOn={() => this.props.toggleSubscriptionState(this.props.discussion)}
      onToggleOff={() => this.props.toggleSubscriptionState(this.props.discussion)}
      disabled={this.props.discussion.subscription_hold !== undefined}
      className="subscribe-button"
    />
  )

  publishButton = () =>
    this.props.canPublish ? (
      <ToggleIcon
        key={`Publish_${this.props.discussion.id}`}
        toggled={this.props.discussion.published}
        disabled={!this.props.discussion.can_unpublish && this.props.discussion.published}
        OnIcon={
          <Text color="success">
            <IconPublishSolid
              title={I18n.t('Unpublish %{title}', {title: this.props.discussion.title})}
            />
          </Text>
        }
        OffIcon={
          <Text color="secondary">
            <IconUnpublishedLine
              title={I18n.t('Publish %{title}', {title: this.props.discussion.title})}
            />
          </Text>
        }
        onToggleOn={() => this.props.updateDiscussion(this.props.discussion, {published: true}, {})}
        onToggleOff={() =>
          this.props.updateDiscussion(this.props.discussion, {published: false}, {})
        }
        className="publish-button"
      />
    ) : null

  pinMenuItemDisplay = () => {
    if (this.props.discussion.pinned) {
      return (
        <span aria-hidden="true">
          <IconPinLine />
          &nbsp;&nbsp;{I18n.t('Unpin')}
        </span>
      )
    } else {
      return (
        <span aria-hidden="true">
          <IconPinSolid />
          &nbsp;&nbsp;{I18n.t('Pin')}
        </span>
      )
    }
  }

  unmountMasterCourseLock = () => {
    if (this.masterCourseLock) {
      this.masterCourseLock.remove()
      this.masterCourseLock = null
    }
  }

  createMenuItem = (itemKey, visibleItemLabel, screenReaderContent) => (
    <Menu.Item
      key={itemKey}
      value={{action: itemKey, id: this.props.discussion.id}}
      id={`${itemKey}-discussion-menu-option`}
    >
      {visibleItemLabel}
      <ScreenReaderContent>{screenReaderContent}</ScreenReaderContent>
    </Menu.Item>
  )

  renderMenuToolIcon(menuTool) {
    if (menuTool.canvas_icon_class) {
      return (
        <span>
          <i className={menuTool.canvas_icon_class} />
          &nbsp;&nbsp;{menuTool.title}
        </span>
      )
    } else if (menuTool.icon_url) {
      return (
        <span>
          <img className="icon" alt="" src={menuTool.icon_url} />
          &nbsp;&nbsp;{menuTool.title}
        </span>
      )
    } else {
      return (
        <span>
          <IconLtiLine />
          &nbsp;&nbsp;{menuTool.title}
        </span>
      )
    }
  }

  renderMenuList = () => {
    const discussionTitle = this.props.discussion.title
    const menuList = []
    if (this.props.displayLockMenuItem) {
      const menuLabel = this.props.discussion.locked
        ? I18n.t('Open for comments')
        : I18n.t('Close for comments')
      const screenReaderContent = this.props.discussion.locked
        ? I18n.t('Open discussion %{title} for comments', {title: discussionTitle})
        : I18n.t('Close discussion %{title} for comments', {title: discussionTitle})
      const icon = this.props.discussion.locked ? <IconUnlockLine /> : <IconLockLine />
      menuList.push(
        this.createMenuItem(
          'togglelocked',
          <span aria-hidden="true">
            {' '}
            {icon}&nbsp;&nbsp;{menuLabel}{' '}
          </span>,
          screenReaderContent
        )
      )
    }

    if (this.props.displayPinMenuItem) {
      const screenReaderContent = this.props.discussion.pinned
        ? I18n.t('Unpin discussion %{title}', {title: discussionTitle})
        : I18n.t('Pin discussion %{title}', {title: discussionTitle})
      menuList.push(
        this.createMenuItem('togglepinned', this.pinMenuItemDisplay(), screenReaderContent)
      )
    }

    if (this.props.onMoveDiscussion) {
      menuList.push(
        this.createMenuItem(
          'moveTo',
          <span aria-hidden="true">
            <IconUpdownLine />
            &nbsp;&nbsp;{I18n.t('Move To')}
          </span>,
          I18n.t('Move discussion %{title}', {title: discussionTitle})
        )
      )
    }

    if (this.props.displayDuplicateMenuItem) {
      menuList.push(
        this.createMenuItem(
          'duplicate',
          <span aria-hidden="true">
            <IconCopySolid />
            &nbsp;&nbsp;{I18n.t('Duplicate')}
          </span>,
          I18n.t('Duplicate discussion %{title}', {title: discussionTitle})
        )
      )
    }

    if (this.props.DIRECT_SHARE_ENABLED) {
      menuList.push(
        this.createMenuItem(
          'sendTo',
          <span aria-hidden="true">
            <IconUserLine />
            &nbsp;&nbsp;{I18n.t('Send To...')}
          </span>,
          I18n.t('Send %{title} to user', {title: discussionTitle})
        )
      )
      menuList.push(
        this.createMenuItem(
          'copyTo',
          <span aria-hidden="true">
            <IconDuplicateLine />
            &nbsp;&nbsp;{I18n.t('Copy To...')}
          </span>,
          I18n.t('Copy %{title} to course', {title: discussionTitle})
        )
      )
    }

    // This returns an empty struct if assignment_id is falsey
    if (this.props.displayMasteryPathsMenuItem) {
      menuList.push(
        this.createMenuItem(
          'masterypaths',
          <span aria-hidden="true">{I18n.t('Mastery Paths')}</span>,
          I18n.t('Edit Mastery Paths for %{title}', {title: discussionTitle})
        )
      )
    }

    if (this.props.discussionTopicMenuTools.length > 0) {
      this.props.discussionTopicMenuTools.forEach(menuTool => {
        menuList.push(
          <Menu.Item
            key={menuTool.base_url}
            value={{
              action: 'ltiMenuTool',
              id: this.props.discussion.id,
              title: this.props.discussion.title,
              menuTool
            }}
            id="menuTool-discussion-menu-option"
          >
            <span aria-hidden="true">{this.renderMenuToolIcon(menuTool)}</span>
            <ScreenReaderContent>{menuTool.title}</ScreenReaderContent>
          </Menu.Item>
        )
      })
    }

    if (this.props.displayDeleteMenuItem) {
      menuList.push(
        this.createMenuItem(
          'delete',
          <span aria-hidden="true">
            <IconTrashSolid />
            &nbsp;&nbsp;{I18n.t('Delete')}
          </span>,
          I18n.t('Delete discussion %{title}', {title: discussionTitle})
        )
      )
    }

    return menuList
  }

  renderDragHandleIfAppropriate = () => {
    if (this.props.draggable && this.props.connectDragSource) {
      return (
        <div className="ic-item-row__drag-col">
          <span>
            <Text color="secondary" size="large">
              <IconDragHandleLine />
            </Text>
          </span>
        </div>
      )
    } else {
      return null
    }
  }

  renderSectionsTooltip = () => {
    if (
      this.props.contextType === 'group' ||
      this.props.discussion.assignment ||
      this.props.discussion.group_category_id ||
      this.props.isMasterCourse
    ) {
      return null
    }

    return (
      <SectionsTooltip
        totalUserCount={this.props.discussion.user_count}
        sections={this.props.discussion.sections}
      />
    )
  }

  renderTitle = () => {
    const refFn = c => {
      this._titleElement = c
    }
    const linkUrl = this.props.discussion.html_url
    return (
      <div className="ic-item-row__content-col">
        <Heading level="h3" margin="0">
          <a style={{color: 'inherit'}} className="discussion-title" ref={refFn} href={linkUrl}>
            {this.props.discussion.read_state !== 'read' && (
              <ScreenReaderContent>{I18n.t('unread,')}</ScreenReaderContent>
            )}
            <span aria-hidden="true">{this.props.discussion.title}</span>
            <ScreenReaderContent>{this.getAccessibleTitle()}</ScreenReaderContent>
          </a>
        </Heading>
      </div>
    )
  }

  renderLastReplyAt = () => {
    const datetimeString = $.datetimeString(this.props.discussion.last_reply_at)
    if (!datetimeString.length || this.props.discussion.discussion_subentry_count === 0) {
      return null
    }
    return (
      <div className="ic-item-row__content-col ic-discussion-row__content last-reply-at">
        {I18n.t('Last post at %{date}', {date: datetimeString})}
      </div>
    )
  }

  renderDueDate = () => {
    const assignment = this.props.discussion.assignment
    let dueDateString = null
    let className = ''
    if (assignment && assignment.due_at) {
      className = 'due-date'
      dueDateString = I18n.t('Due %{date}', {date: $.datetimeString(assignment.due_at)})
    } else if (this.props.discussion.todo_date) {
      className = 'todo-date'
      dueDateString = I18n.t('To do %{date}', {
        date: $.datetimeString(this.props.discussion.todo_date)
      })
    }
    return <div className={`ic-discussion-row__content ${className}`}>{dueDateString}</div>
  }

  renderAvailabilityDate = () => {
    // Check if we are too early for the topic to be available
    const availabilityString = this.getAvailabilityString()
    return (
      availabilityString && (
        <div className="discussion-availability ic-item-row__content-col ic-discussion-row__content">
          {this.getAvailabilityString()}
        </div>
      )
    )
  }

  renderIcon = () => {
    if (this.props.discussion.assignment) {
      if (this.props.discussion.published) {
        return (
          <Text color="success" size="large">
            <IconAssignmentLine />
          </Text>
        )
      } else {
        return (
          <Text color="secondary" size="large">
            <IconAssignmentLine />
          </Text>
        )
      }
    }
    return null
  }

  renderUpperRightBadges = () => {
    const assignment = this.props.discussion.assignment
    const peerReview = assignment ? assignment.peer_reviews : false
    const maybeRenderPeerReviewIcon = peerReview ? (
      <span className="ic-item-row__peer_review">
        <Text color="success" size="medium">
          <IconPeerReviewLine />
        </Text>
      </span>
    ) : null
    const maybeDisplayManageMenu = this.props.displayManageMenu ? (
      <span display="inline-block">
        <DiscussionManageMenu
          menuRefFn={c => {
            this._manageMenu = c
          }}
          onSelect={this.onManageDiscussion}
          entityTitle={this.props.discussion.title}
          menuOptions={this.renderMenuList}
        />
      </span>
    ) : null
    const returnTo = encodeURIComponent(window.location.pathname)
    const discussionId = this.props.discussion.id
    const maybeRenderMasteryPathsPill = this.props.displayMasteryPathsPill ? (
      <span display="inline-block" className="discussion-row-mastery-paths-pill">
        <Pill text={this.props.masteryPathsPillLabel} />
      </span>
    ) : null
    const maybeRenderMasteryPathsLink = this.props.displayMasteryPathsLink ? (
      <a
        href={`discussion_topics/${discussionId}/edit?return_to=${returnTo}#mastery-paths-editor`}
        className="discussion-index-mastery-paths-link"
      >
        {I18n.t('Mastery Paths')}
      </a>
    ) : null
    const actionsContent = [this.readCount(), this.publishButton(), this.subscribeButton()]
    return (
      <div>
        <div>
          {maybeRenderMasteryPathsPill}
          {maybeRenderMasteryPathsLink}
          {maybeRenderPeerReviewIcon}
          {actionsContent}
          <span ref={this.initializeMasterCourseIcon} className="ic-item-row__master-course-lock" />
          {maybeDisplayManageMenu}
        </div>
      </div>
    )
  }

  renderDiscussion = () => {
    const classes = cx('ic-item-row')
    return this.props.connectDropTarget(
      this.props.connectDragSource(
        <div
          style={{opacity: this.props.isDragging ? 0 : 1}}
          className={`${classes} ic-discussion-row`}
        >
          <div className="ic-discussion-row-container">
            <span className="ic-drag-handle-container">{this.renderDragHandleIfAppropriate()}</span>
            <span className="ic-drag-handle-container">{this.renderIcon()}</span>
            <span className="ic-discussion-content-container">
              <Grid startAt="medium" vAlign="middle" rowSpacing="none" colSpacing="none">
                <Grid.Row vAlign="middle">
                  <Grid.Col vAlign="middle" textAlign="start">
                    {this.renderTitle()}
                    {this.renderSectionsTooltip()}
                  </Grid.Col>
                  <Grid.Col vAlign="top" textAlign="end">
                    {this.renderUpperRightBadges()}
                  </Grid.Col>
                </Grid.Row>
                <Grid.Row>
                  <Grid.Col textAlign="start">
                    <span aria-hidden="true">{this.renderLastReplyAt()}</span>
                  </Grid.Col>
                  <Grid.Col textAlign="center">
                    <span aria-hidden="true">{this.renderAvailabilityDate()}</span>
                  </Grid.Col>
                  <Grid.Col textAlign="end">
                    <span aria-hidden="true">{this.renderDueDate()}</span>
                  </Grid.Col>
                </Grid.Row>
              </Grid>
            </span>
          </div>
        </div>,
        {dropEffect: 'copy'}
      )
    )
  }

  renderBlueUnreadBadge() {
    if (this.props.discussion.read_state !== 'read') {
      return <Badge margin="0 small x-small 0" standalone type="notification" />
    } else {
      return (
        <View display="block" margin="0 small x-small 0">
          <View display="block" margin="0 small x-small 0" />
        </View>
      )
    }
  }

  render() {
    return (
      <div>
        <Grid startAt="medium" vAlign="middle" colSpacing="none">
          <Grid.Row>
            {/* discussion topics is different for badges so we use our own read indicator instead of passing to isRead */}
            <Grid.Col width="auto">{this.renderBlueUnreadBadge()}</Grid.Col>
            <Grid.Col>{this.renderDiscussion()}</Grid.Col>
          </Grid.Row>
        </Grid>
      </div>
    )
  }
}

const mapDispatch = dispatch => {
  const actionKeys = [
    'cleanDiscussionFocus',
    'duplicateDiscussion',
    'toggleSubscriptionState',
    'updateDiscussion',
    'setCopyTo',
    'setSendToOpen'
  ]
  return bindActionCreators(select(actions, actionKeys), dispatch)
}

const mapState = (state, ownProps) => {
  const {discussion} = ownProps
  const cyoe = CyoeHelper.getItemData(discussion.assignment_id)
  let masterCourse = true
  if (!state.masterCourseData || !state.masterCourseData.isMasterCourse) {
    masterCourse = false
  }
  const shouldShowMasteryPathsPill =
    cyoe.isReleased &&
    cyoe.releasedLabel &&
    cyoe.releasedLabel !== '' &&
    discussion.permissions.update
  const propsFromState = {
    canPublish: state.permissions.publish,
    contextType: state.contextType,
    discussionTopicMenuTools: state.discussionTopicMenuTools,
    displayDeleteMenuItem: !(
      discussion.is_master_course_child_content && discussion.restricted_by_master_course
    ),
    displayDuplicateMenuItem: state.permissions.manage_content,
    displayLockMenuItem: discussion.can_lock,
    displayMasteryPathsMenuItem: cyoe.isCyoeAble,
    displayMasteryPathsLink: cyoe.isTrigger && discussion.permissions.update,
    displayMasteryPathsPill: shouldShowMasteryPathsPill,
    masteryPathsPillLabel: cyoe.releasedLabel,
    displayManageMenu: discussion.permissions.delete,
    displayPinMenuItem: state.permissions.moderate,
    masterCourseData: state.masterCourseData,
    isMasterCourse: masterCourse,
    DIRECT_SHARE_ENABLED: state.DIRECT_SHARE_ENABLED
  }
  return Object.assign({}, ownProps, propsFromState)
}

export const DraggableDiscussionRow = compose(
  DropTarget('Discussion', dropTarget, dConnect => ({
    connectDropTarget: dConnect.dropTarget()
  })),
  DragSource('Discussion', dragTarget, (dConnect, monitor) => ({
    connectDragSource: dConnect.dragSource(),
    isDragging: monitor.isDragging(),
    connectDragPreview: dConnect.dragPreview()
  }))
)(DiscussionRow)
export const ConnectedDiscussionRow = connect(
  mapState,
  mapDispatch
)(DiscussionRow)
export const ConnectedDraggableDiscussionRow = connect(
  mapState,
  mapDispatch
)(DraggableDiscussionRow)
